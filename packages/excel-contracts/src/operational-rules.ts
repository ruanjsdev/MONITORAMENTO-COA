export type OperationalExcelUpdateInput = {
  status?: string | null;
  description?: string | null;
  receivedAt: string | Date;
  startAt?: string | Date | null;
  forecastAt?: string | Date | null;
  forecastInformed?: boolean;
};

export type OperationalExcelUpdate = {
  valid: boolean;
  status: string;
  description: string;
  startDate: string | null;
  startTime: string | null;
  forecastDate: string | null;
  forecastTime: string | null;
  clearedFields: string[];
  errors: string[];
  reasons: string[];
};

const knownStatuses = new Set(["R", "P", "D", "E"]);

export function normalizeOperationalExcelUpdate(input: OperationalExcelUpdateInput): OperationalExcelUpdate {
  const status = String(input.status ?? "").trim().toUpperCase();
  const errors: string[] = [];
  const reasons: string[] = [];
  if (!knownStatuses.has(status)) errors.push("STATUS_UNKNOWN");

  if (status === "R") {
    return {
      valid: errors.length === 0,
      status,
      description: "RODANDO",
      startDate: null,
      startTime: null,
      forecastDate: null,
      forecastTime: null,
      clearedFields: ["startDate", "startTime", "forecastDate", "forecastTime"],
      errors,
      reasons: ["STATUS_RUNNING_FORCES_DESCRIPTION", "STATUS_RUNNING_CLEARS_OCCURRENCE_DATES"]
    };
  }

  const receivedAt = parseOperationalDate(input.receivedAt);
  const informedStart = input.startAt ? parseOperationalDate(input.startAt) : null;
  const start = informedStart ?? receivedAt;
  if (!start) errors.push("INVALID_RECEIVED_AT");
  else reasons.push(informedStart ? "INFORMED_START_PRESERVED" : "RECEIVED_TIMESTAMP_USED_AS_START");

  let forecast: Date | null = null;
  if (input.forecastAt) {
    if (input.forecastInformed !== true) errors.push("FORECAST_NOT_INFORMED");
    forecast = parseOperationalDate(input.forecastAt);
    if (!forecast) errors.push("INVALID_FORECAST");
    else if (start && forecast.getTime() < start.getTime()) errors.push("FORECAST_BEFORE_START");
  }

  const description = String(input.description ?? "").trim();
  if (!description) errors.push("OCCURRENCE_DESCRIPTION_REQUIRED");
  return {
    valid: errors.length === 0,
    status,
    description,
    startDate: start ? formatDate(start) : null,
    startTime: start ? formatTime(start) : null,
    forecastDate: forecast ? formatDate(forecast) : null,
    forecastTime: forecast ? formatTime(forecast) : null,
    clearedFields: [],
    errors,
    reasons
  };
}

export function parseOperationalDate(value: string | Date): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value);
  const brazilian = value.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (brazilian) {
    const [, day, month, year, hour = "00", minute = "00", second = "00"] = brazilian;
    const result = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
    if (result.getFullYear() !== Number(year) || result.getMonth() !== Number(month) - 1 || result.getDate() !== Number(day)) return null;
    return result;
  }
  const result = new Date(value);
  return Number.isNaN(result.getTime()) ? null : result;
}

function formatDate(value: Date) {
  return [value.getDate(), value.getMonth() + 1, value.getFullYear()].map((part, index) => index < 2 ? String(part).padStart(2, "0") : String(part)).join("/");
}

function formatTime(value: Date) {
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}
