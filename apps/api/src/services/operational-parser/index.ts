import { extractEquipment } from "./extract-equipment.js";
import {
  classifyOperation,
  extractForecast,
  extractLocation,
  extractSituation,
  extractStatus
} from "./extract-fields.js";
import { normalizeMessage } from "./normalize-message.js";
import { ParsedOperationalMessage, ParsedReport, ParsedReportInventoryItem } from "./types.js";

export type ParserContext = {
  operation?: string | null;
  shift?: string | null;
  date?: string | null;
  variety?: string | null;
};

type ReportMode = "FLEETS" | "AVAILABLE_IMPLEMENTMENTS" | "STOPPED_FLEETS";
type EquipmentLine = {
  fleet: string;
  attachments: string[];
  description: string;
};
type PendingReportLine = {
  line: EquipmentLine;
  originalText: string;
  operation: string | null;
  location: string | null;
  mode: ReportMode;
};

const equipmentListPattern =
  /(?:^|\s)((?:\d{3,6}\s*(?:,|;|\be\b)\s*)+\d{3,6})\s*(?:=|:|-)?\s*(.+)$/i;

export * from "./types.js";
export {
  normalizeMessage,
  extractEquipment,
  extractStatus,
  extractSituation,
  extractLocation,
  extractForecast,
  classifyOperation
};

export function parseMessage(
  originalText: string,
  context: ParserContext = {}
): ParsedOperationalMessage {
  const normalized = normalizeMessage(originalText);
  const equipment = extractEquipment(originalText);
  const status = extractStatus(originalText);
  const situation = extractSituation(originalText);
  const operation = classifyOperation(originalText, context.operation);
  const place = extractLocation(originalText);
  const forecastAt = extractForecast(originalText, dateFromContext(context.date));
  const rawDescription = (originalText.split("=").slice(1).join("=") || originalText).trim();
  const normalizedDescription = normalizeMessage(rawDescription);
  const description = /^(rodando|rodou|disponivel)$/.test(normalizedDescription)
    ? null
    : rawDescription || null;
  const warnings: string[] = [];
  const unresolvedFields: string[] = [];
  if (!equipment.mainEquipment) unresolvedFields.push("mainEquipment");
  if (!operation) unresolvedFields.push("operation");
  if (!status && situation) {
    warnings.push("Situação identificada sem regra para alterar o status; manter estado anterior.");
    unresolvedFields.push("proposedStatus");
  }
  if (!status && !situation) unresolvedFields.push("status");
  const confidenceParts = [
    equipment.mainEquipment ? 1 : 0,
    operation?.startsWith("context:") ? 0.6 : operation ? 0.9 : 0,
    status ? 0.9 : situation ? 0.55 : 0,
    place.location ? 0.8 : 0.4
  ];
  const confidence = Number(
    (confidenceParts.reduce((a, b) => a + b, 0) / confidenceParts.length).toFixed(2)
  );
  return {
    originalText,
    operation,
    mainEquipment: equipment.mainEquipment,
    attachments: equipment.attachments,
    equipmentSet: equipment.equipmentSet,
    currentStatus: null,
    proposedStatus: status,
    operationalSituation: situation,
    description,
    location: place.location,
    destination: place.destination,
    forecastAt,
    date: context.date ?? null,
    time: normalized.match(/\b\d{1,2}:\d{2}\b/)?.[0] ?? null,
    shift: context.shift ?? null,
    variety: context.variety ?? null,
    confidence,
    fieldConfidence: {
      equipment: equipment.mainEquipment ? 1 : 0,
      operation: operation ? 0.9 : 0,
      status: status ? 0.9 : 0.3,
      situation: situation ? 0.9 : 0.3,
      location: place.location ? 0.8 : 0.3,
      forecast: forecastAt ? 0.9 : 0.3
    },
    warnings,
    unresolvedFields
  };
}

export function parseMessages(
  originalText: string,
  context: ParserContext = {}
): ParsedOperationalMessage[] {
  const list = originalText.match(equipmentListPattern);
  if (!list) return [parseMessage(originalText, context)];

  const fleets = list[1].match(/\d{3,6}/g) ?? [];
  const sharedText = list[2].trim();
  const operation = classifyOperation(originalText, context.operation);
  return [...new Set(fleets)].map((fleet) => ({
    ...parseMessage(`${fleet} = ${sharedText}`, { ...context, operation }),
    originalText
  }));
}

export function parseReport(text: string, context: ParserContext = {}): ParsedReport {
  const originalLines = text.split(/\r?\n/).filter((line) => line.trim());
  const title = originalLines[0]?.trim() ?? null;
  const header = {
    title,
    sector: headerValue(originalLines, "setor"),
    date: headerValue(originalLines, "data"),
    shift: headerValue(originalLines, "turno") ?? context.shift ?? null,
    variety: headerValue(originalLines, "variedade") ?? context.variety ?? null
  };
  let operation = classifyOperation(cleanReportLine(title ?? ""), context.operation);
  let location = header.sector;
  let mode: ReportMode = "FLEETS";
  let pending: PendingReportLine | null = null;
  const items: ParsedOperationalMessage[] = [];
  const inventoryItems: ParsedReportInventoryItem[] = [];
  const ignoredLines: ParsedReport["ignoredLines"] = [];

  const flushPending = (continuation?: string, continuationOriginal?: string) => {
    if (!pending) return;
    const description = [pending.line.description, continuation].filter(Boolean).join(" ").trim();
    const line = { ...pending.line, description };
    if (pending.mode === "AVAILABLE_IMPLEMENTMENTS")
      inventoryItems.push(
        inventoryFromLine(
          line,
          continuationOriginal ?? pending.originalText,
          pending.operation,
          pending.location
        )
      );
    else
      items.push(
        operationalItemFromLine(
          line,
          [pending.originalText, continuationOriginal].filter(Boolean).join("\n"),
          {
            operation: pending.operation,
            shift: header.shift,
            date: header.date,
            variety: header.variety
          },
          pending.location,
          pending.mode
        )
      );
    pending = null;
  };

  for (let index = 0; index < originalLines.length; index += 1) {
    const originalLine = originalLines[index]!;
    const cleaned = cleanReportLine(originalLine);
    const normalized = normalizeMessage(cleaned);
    if (!cleaned) continue;

    if (index === 0 || isHeaderLine(normalized)) {
      flushPending();
      continue;
    }

    if (/\bimplementos?\s+disponiveis?\b/.test(normalized)) {
      flushPending();
      mode = "AVAILABLE_IMPLEMENTMENTS";
      continue;
    }

    if (/^frotas?\b/.test(normalized) && !parseEquipmentLine(cleaned)) {
      flushPending();
      mode = /[\u26a0\u274c\u{1f527}]/u.test(originalLine) ? "STOPPED_FLEETS" : "FLEETS";
      continue;
    }

    const classified = classifyOperation(cleaned);
    if (classified && !parseEquipmentLine(cleaned)) {
      flushPending();
      operation = classified;
      mode = "FLEETS";
      continue;
    }

    if (isLocationHeading(originalLine, cleaned)) {
      flushPending();
      location = cleaned;
      continue;
    }

    if (mode !== "AVAILABLE_IMPLEMENTMENTS" && equipmentListPattern.test(cleaned)) {
      flushPending();
      const listed = parseMessages(cleaned, {
        operation,
        shift: header.shift,
        date: header.date,
        variety: header.variety
      });
      for (const item of listed) {
        item.originalText = originalLine.trim();
        item.location = item.location ?? location;
        items.push(item);
      }
      continue;
    }

    const equipmentLine = parseEquipmentLine(cleaned);
    if (equipmentLine) {
      flushPending();
      pending = {
        line: equipmentLine,
        originalText: originalLine.trim(),
        operation,
        location,
        mode
      };
      if (equipmentLine.description) flushPending();
      continue;
    }

    if (pending) {
      flushPending(cleaned, originalLine.trim());
      continue;
    }

    ignoredLines.push({ originalText: originalLine.trim(), reason: ignoredLineReason(mode) });
  }
  flushPending();

  const warnings: string[] = [];
  if (!items.length) warnings.push("Nenhuma linha de frota reconhecida.");
  if (inventoryItems.length)
    warnings.push(
      `${inventoryItems.length} implemento(s) de inventário separado(s); nenhuma pendência de frota será criada para eles.`
    );
  if (ignoredLines.length)
    warnings.push(`${ignoredLines.length} linha(s) preservada(s) para revisão.`);
  return { originalText: text, header, items, inventoryItems, ignoredLines, warnings };
}

export function cleanReportLine(value: string) {
  return value
    .replace(/\*/g, "")
    .replace(/_/g, " ")
    .replace(/[^-\p{L}\p{N}\s:=/.,()]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function operationalItemFromLine(
  line: EquipmentLine,
  originalText: string,
  context: ParserContext,
  reportLocation: string | null,
  mode: ReportMode
) {
  const set = [line.fleet, ...line.attachments].join("/");
  const canonical = `${set} = ${line.description}`.trim();
  const parsed = parseMessage(canonical, context);
  parsed.originalText = originalText;
  parsed.mainEquipment = line.fleet;
  parsed.attachments = line.attachments;
  parsed.equipmentSet = set;
  parsed.location =
    parsed.operationalSituation === "DESLOCAMENTO"
      ? (parsed.location ?? reportLocation)
      : reportLocation;
  if (parsed.location) parsed.fieldConfidence.location = 0.9;

  if (!isMeaningfulDescription(line.description)) {
    parsed.description = null;
    parsed.proposedStatus = null;
    parsed.confidence = Math.min(parsed.confidence, 0.35);
    parsed.warnings.push("Linha de frota incompleta; nenhuma alteração deve ser proposta.");
    addUnresolved(parsed, "description");
    addUnresolved(parsed, "status");
    return parsed;
  }

  if (!parsed.proposedStatus && parsed.operationalSituation === "AGUARDANDO_AREA") {
    parsed.proposedStatus = "DISPONIVEL";
    parsed.fieldConfidence.status = 0.9;
    parsed.warnings = parsed.warnings.filter(
      (warning) => !normalizeMessage(warning).includes("manter estado anterior")
    );
    parsed.warnings.push("Status DISPONÍVEL inferido da informação explícita AG / ÁREA.");
    parsed.unresolvedFields = parsed.unresolvedFields.filter(
      (field) => field !== "status" && field !== "proposedStatus"
    );
  }

  if (!parsed.proposedStatus && mode === "STOPPED_FLEETS") {
    parsed.proposedStatus = "PARADO";
    parsed.fieldConfidence.status = 0.78;
    parsed.confidence = Math.min(parsed.confidence, 0.78);
    parsed.warnings.push("Status PARADO inferido da seção de frotas indisponíveis.");
    parsed.warnings = parsed.warnings.filter(
      (warning) => !normalizeMessage(warning).includes("manter estado anterior")
    );
    parsed.unresolvedFields = parsed.unresolvedFields.filter(
      (field) => field !== "status" && field !== "proposedStatus"
    );
  }
  return parsed;
}

function inventoryFromLine(
  line: EquipmentLine,
  originalText: string,
  operation: string | null,
  location: string | null
): ParsedReportInventoryItem {
  const parsed = parseMessage(`${line.fleet} = ${line.description}`, { operation });
  return {
    equipmentCode: line.fleet,
    status: parsed.proposedStatus,
    description: line.description || null,
    operation,
    location,
    originalText
  };
}

function parseEquipmentLine(cleaned: string): EquipmentLine | null {
  const value = cleaned.replace(/^=+\s*/, "").trim();
  const splitImplement = value.match(
    /^(\d{3,6})\s*=\s*(\d{3,6}(?:\s*\/\s*\d{3,6})+)\s*(?:=|:)\s*(.*)$/
  );
  if (splitImplement)
    return {
      fleet: splitImplement[1]!,
      attachments: splitImplement[2]!.split("/").map((part) => part.trim()),
      description: splitImplement[3]!.trim()
    };

  const direct = value.match(
    /^(\d{3,6})(?=\s|[-/=:.]|$)(?:\s*[/-]\s*(\d{3,6}(?:\s*\/\s*\d{3,6})*))?\s*[-=:/.]?\s*(.*)$/
  );
  if (!direct) return null;
  return {
    fleet: direct[1]!,
    attachments: direct[2]
      ? direct[2]
          .split("/")
          .map((part) => part.trim())
          .filter(Boolean)
      : [],
    description: direct[3]!.trim()
  };
}

function headerValue(lines: string[], key: string) {
  for (const line of lines) {
    const cleaned = cleanReportLine(line);
    const normalized = normalizeMessage(cleaned);
    const match = normalized.match(new RegExp(`^${key}\\s*:?\\s*(.+)$`, "i"));
    if (!match) continue;
    const offset = cleaned.toLowerCase().search(new RegExp(key, "i"));
    return cleaned
      .slice(offset + key.length)
      .replace(/^\s*:\s*/, "")
      .trim();
  }
  return null;
}

function isHeaderLine(normalized: string) {
  return /^(?:setor|data|turno|variedade)\s*:?\s*/.test(normalized);
}

function isLocationHeading(original: string, cleaned: string) {
  const normalized = normalizeMessage(cleaned);
  if (/^(?:local|fazenda|frente|setor)\s*:?\s+/.test(normalized)) return true;
  return /[\u{1f53b}\u25bc]/u.test(original) && !/^(?:frota|implemento)/.test(normalized);
}

function isMeaningfulDescription(value: string) {
  const normalized = normalizeMessage(value)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (
    Boolean(normalized) && !/^(?:frota|trator|maquina|implemento|equipamento)$/.test(normalized)
  );
}

function addUnresolved(parsed: ParsedOperationalMessage, field: string) {
  if (!parsed.unresolvedFields.includes(field)) parsed.unresolvedFields.push(field);
}

function ignoredLineReason(mode: ReportMode) {
  return mode === "AVAILABLE_IMPLEMENTMENTS"
    ? "Texto sem código de implemento na seção de inventário."
    : "Texto sem frota ou regra operacional segura.";
}

function dateFromContext(value?: string | null) {
  const match = value?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return new Date();
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), 12, 0, 0, 0);
}
