import { normalizeMessage } from "./normalize-message.js";
import { operations, situationRules, statusRules } from "./rules.js";
export function extractStatus(text: string) {
  const n = normalizeMessage(text);
  return statusRules.find(([r]) => r.test(n))?.[1] ?? null;
}
export function extractSituation(text: string) {
  const n = normalizeMessage(text);
  return (
    situationRules.find(([r]) => r.test(n))?.[1] ??
    (extractStatus(text) === "RODANDO" ? "NORMAL" : null)
  );
}
export function classifyOperation(text: string, fallback?: string | null) {
  const n = normalizeMessage(text);
  return operations.find(([r]) => r.test(n))?.[1] ?? fallback ?? null;
}
export function extractLocation(text: string) {
  const n = normalizeMessage(text);
  const explicit =
    n.match(/(?:para|no|na)\s+([a-z][a-z0-9/\s]+?)(?:\s+com|\s+previsao|\s*$)/)?.[1]?.trim() ??
    null;
  const moved = n.match(/deslocamento(?:\s+para)?\s+([a-z][a-z0-9/\s]+)$/)?.[1]?.trim() ?? null;
  const destination = explicit ?? moved;
  const sector = n.match(/\b([djk]\d+)\b/i)?.[1]?.toUpperCase() ?? null;
  return {
    location: sector ?? destination,
    destination: n.includes("deslocamento") ? destination : null
  };
}
export function extractForecast(text: string, baseDate = new Date()) {
  const n = normalizeMessage(text);
  const full = n.match(
    /previsao(?: de liberacao)?\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(?:as\s+)?(\d{1,2})\s*(?::|h(?:rs?)?)\s*(\d{2})?/
  );
  const time = n.match(/previsao(?: de liberacao)?\s+(\d{1,2}):(\d{2})/);
  if (full) {
    const year = full[3]
      ? Number(full[3].length === 2 ? `20${full[3]}` : full[3])
      : baseDate.getFullYear();
    return new Date(
      year,
      Number(full[2]) - 1,
      Number(full[1]),
      Number(full[4]),
      Number(full[5] ?? 0)
    ).toISOString();
  }
  if (time) {
    const d = new Date(baseDate);
    d.setHours(Number(time[1]), Number(time[2]), 0, 0);
    return d.toISOString();
  }
  return null;
}
