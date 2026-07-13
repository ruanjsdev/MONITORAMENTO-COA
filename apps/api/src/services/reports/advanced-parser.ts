import { parseMessage } from "../operational-parser/index.js";
import { ParsedOperationalMessage } from "../operational-parser/types.js";
import { ReportAlert } from "./forecast-engine.js";

export type AdvancedParsedItem = ParsedOperationalMessage & {
  sourceLines: string[];
  informedImplement?: string | null;
  normalized: Array<{ field: string; original: string; interpreted: string; confidence: number; reason: string }>;
  duplicateState?: "UNIQUE" | "MERGED" | "CONFLICT";
};

export type AdvancedReportParse = {
  header: { sector: string | null; date: string | null; shift: string | null; variety: string | null };
  sections: Array<{ operation: string; items: AdvancedParsedItem[] }>;
  items: AdvancedParsedItem[];
  alerts: ReportAlert[];
};

const knownFleets = ["1531", "1529", "164", "626", "625", "1530", "1601"];
const knownDescriptions = ["MANGUEIRA ESTOURADA", "PROBLEMA MECÂNICO", "NÃO GIRA LADO DIREITO", "RODANDO", "VAZAMENTO HIDRÁULICO"];

export function parseAdvancedOperationalReport(text: string, context: { operation?: string | null; shift?: string | null } = {}): AdvancedReportParse {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const header = {
    sector: headerValue(lines, "setor"),
    date: headerValue(lines, "data"),
    shift: headerValue(lines, "turno") ?? context.shift ?? null,
    variety: headerValue(lines, "variedade")
  };
  const sections = new Map<string, AdvancedParsedItem[]>();
  const alerts: ReportAlert[] = [];
  let operation = context.operation ?? "Plantio de Cana";
  const pendingLineParts: string[] = [];

  function flushLineParts() {
    if (!pendingLineParts.length) return;
    const line = pendingLineParts.join(" ");
    pendingLineParts.length = 0;
    if (!/\d/.test(line)) return;
    const item = parseItem(line, operation, header.shift);
    if (item.alert) alerts.push(item.alert);
    const bucket = sections.get(operation) ?? [];
    bucket.push(item.item);
    sections.set(operation, bucket);
  }

  for (const raw of lines) {
    const normalized = stripEmoji(raw);
    const maybeOperation = operationName(normalized);
    if (maybeOperation && !/\d+\s*=/.test(normalized)) {
      flushLineParts();
      operation = maybeOperation;
      if (!sections.has(operation)) sections.set(operation, []);
      continue;
    }
    if (/^\d{2}\/\d{2}|\b(setor|data|turno|variedade)\b/i.test(normalized)) continue;
    if (/^[a-zA-Z0-9]{2,6}(?:\/[a-zA-Z0-9]{2,6})?\s*=/.test(normalized)) {
      flushLineParts();
      pendingLineParts.push(normalized);
    } else if (pendingLineParts.length) {
      pendingLineParts.push(normalized);
    }
  }
  flushLineParts();

  for (const [sectionOperation, items] of sections) sections.set(sectionOperation, consolidateDuplicates(items, alerts));
  const sectionList = [...sections.entries()].map(([sectionOperation, items]) => ({ operation: sectionOperation, items }));
  return { header, sections: sectionList, items: sectionList.flatMap(section => section.items), alerts };
}

function parseItem(line: string, operation: string, shift: string | null) {
  const [left, ...rightParts] = line.split("=");
  const right = rightParts.join("=").trim();
  const [fleetRaw, implementRaw] = left.trim().split("/");
  const fleet = normalizeFleet(fleetRaw);
  const description = normalizeDescription(right);
  const parsed = parseMessage(`${fleet.value}${implementRaw ? `/${implementRaw}` : ""} = ${description.value}`, { operation, shift });
  parsed.operation = operation;
  parsed.mainEquipment = fleet.value;
  parsed.attachments = implementRaw ? [implementRaw.trim()] : parsed.attachments;
  parsed.description = parsed.proposedStatus === "RODANDO" ? "RODANDO" : description.value;
  parsed.confidence = Number(Math.min(parsed.confidence, fleet.confidence, description.confidence).toFixed(2));
  const normalized = [
    ...(fleet.original !== fleet.value ? [{ field: "fleet", original: fleet.original, interpreted: fleet.value, confidence: fleet.confidence, reason: fleet.reason }] : []),
    ...(description.original !== description.value ? [{ field: "description", original: description.original, interpreted: description.value, confidence: description.confidence, reason: description.reason }] : [])
  ];
  const item: AdvancedParsedItem = { ...parsed, sourceLines: [line], informedImplement: implementRaw?.trim() ?? null, normalized, duplicateState: "UNIQUE" };
  const alert = item.confidence < 0.9 ? { code: "UNCERTAIN_INTERPRETATION" as const, severity: item.confidence >= 0.7 ? "warning" as const : "danger" as const, fleet: item.mainEquipment ?? undefined, message: `Interpretação com confiança ${item.confidence}.`, metadata: { line } } : undefined;
  return { item, alert };
}

function consolidateDuplicates(items: AdvancedParsedItem[], alerts: ReportAlert[]) {
  const grouped = new Map<string, AdvancedParsedItem[]>();
  for (const item of items) grouped.set(item.mainEquipment ?? item.originalText, [...(grouped.get(item.mainEquipment ?? item.originalText) ?? []), item]);
  const result: AdvancedParsedItem[] = [];
  for (const group of grouped.values()) {
    if (group.length === 1) { result.push(group[0]!); continue; }
    const statuses = new Set(group.map(item => item.proposedStatus ?? "UNKNOWN"));
    if (statuses.size > 1) {
      for (const item of group) item.duplicateState = "CONFLICT";
      alerts.push({ code: "DUPLICATE_CONFLICT", severity: "danger", fleet: group[0]?.mainEquipment ?? undefined, message: `Frota ${group[0]?.mainEquipment} repetida com informações contraditórias.`, metadata: { lines: group.flatMap(item => item.sourceLines) } });
      result.push(...group);
      continue;
    }
    const merged = { ...group[0]!, sourceLines: group.flatMap(item => item.sourceLines), duplicateState: "MERGED" as const };
    const withForecast = group.find(item => item.forecastAt);
    const longerDescription = [...group].sort((a, b) => (b.description?.length ?? 0) - (a.description?.length ?? 0))[0];
    merged.forecastAt = withForecast?.forecastAt ?? merged.forecastAt;
    merged.description = longerDescription?.description ?? merged.description;
    result.push(merged);
  }
  return result;
}

export function compareWithOperationState(items: AdvancedParsedItem[], state: { fleet: string; implement?: string | null; status: string; description: string }[]) {
  const alerts: ReportAlert[] = [];
  const changes = [];
  for (const item of items) {
    const current = state.find(row => row.fleet === item.mainEquipment);
    if (!current) { alerts.push({ code: "FLEET_NOT_FOUND", severity: "warning", fleet: item.mainEquipment ?? undefined, message: `Frota ${item.mainEquipment} não encontrada na planilha.` }); continue; }
    const implementMismatch = item.informedImplement && current.implement && item.informedImplement !== current.implement;
    if (implementMismatch) alerts.push({ code: "IMPLEMENT_MISMATCH", severity: "warning", fleet: item.mainEquipment ?? undefined, message: `Implemento diferente para frota ${item.mainEquipment}.`, metadata: { spreadsheetImplement: current.implement, informedImplement: item.informedImplement } });
    const proposedDescription = implementMismatch ? `${item.description} — IMPLEMENTO INFORMADO: ${item.informedImplement}` : item.description;
    if (item.proposedStatus === current.status && proposedDescription === current.description) continue;
    changes.push({ item, current, proposed: { status: item.proposedStatus, description: proposedDescription }, alerts: alerts.filter(alert => alert.fleet === item.mainEquipment) });
  }
  return { changes, alerts };
}

function normalizeFleet(raw: string) {
  const original = raw.trim();
  const cleaned = original.toUpperCase().replace(/^L/, "1").replace(/I/g, "1").replace(/O/g, "0").replace(/\D/g, "");
  if (knownFleets.includes(cleaned)) return { original, value: cleaned, confidence: original === cleaned ? 1 : 0.92, reason: "cadastro de frotas" };
  const nearest = nearestText(cleaned, knownFleets);
  if (nearest.distance <= 1) return { original, value: nearest.value, confidence: 0.86, reason: "distância textual próxima ao cadastro" };
  return { original, value: cleaned || original, confidence: 0.5, reason: "fora do cadastro conhecido" };
}

function normalizeDescription(raw: string) {
  const original = raw.trim();
  const upper = stripEmoji(original).toUpperCase().replace(/\s+/g, " ");
  if (/RODANDO|RODANDO NORMAL|OK/.test(upper)) return { original, value: "RODANDO", confidence: 0.98, reason: "palavra conhecida" };
  const typo = upper.replace("MANGERA", "MANGUEIRA").replace("ESTOURDA", "ESTOURADA");
  const nearest = nearestText(typo, knownDescriptions);
  if (nearest.distance <= 3) return { original, value: nearest.value, confidence: original.toUpperCase() === nearest.value ? 1 : 0.88, reason: "histórico de descrições" };
  return { original, value: typo, confidence: typo.length > 4 ? 0.82 : 0.6, reason: "normalização textual" };
}

function operationName(line: string) {
  const text = line.toLowerCase();
  if (text.includes("plantio")) return "Plantio de Cana";
  if (text.includes("tratos") || text.includes("cultivo")) return "Tratos Culturais";
  if (text.includes("colheita")) return "Colheita de Muda";
  if (text.includes("preparo")) return "Preparo de Solo";
  return null;
}
function headerValue(lines: string[], key: string) { return lines.find(line => line.toLowerCase().startsWith(`${key}:`))?.split(":").slice(1).join(":").trim() ?? null; }
function stripEmoji(value: string) { return value.replace(/[^\p{L}\p{N}\s:=/.,-]/gu, "").trim(); }
function nearestText(value: string, options: string[]) {
  return options.map(option => ({ value: option, distance: levenshtein(value, option) })).sort((a, b) => a.distance - b.distance)[0] ?? { value, distance: 99 };
}
function levenshtein(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_x, j) => i ? j ? 0 : i : j));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length]![b.length]!;
}
