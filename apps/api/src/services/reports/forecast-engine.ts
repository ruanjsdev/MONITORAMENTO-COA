import { OperationStateItem, ForecastState } from "./excel-adapters.js";

export type ForecastEvaluation = {
  fleet: string;
  state: ForecastState;
  alert?: ReportAlert;
  proposal?: {
    forecast: { state: "MISSING"; displayValue: "SEM PREVISÃO"; mergeCells: true; style: "DANGER" };
    previousForecastAt?: string | null;
    expiredAt?: string;
  };
};

export type ReportAlert = {
  code: "FORECAST_EXPIRED" | "FORECAST_MISSING" | "DUPLICATE_CONFLICT" | "FLEET_NOT_FOUND" | "IMPLEMENT_MISMATCH" | "UNCERTAIN_INTERPRETATION" | "MESSAGE_EDITED" | "INVALID_TIME" | "FORECAST_BEFORE_START";
  severity: "info" | "warning" | "danger";
  fleet?: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export function evaluateForecast(item: OperationStateItem, now = new Date()): ForecastEvaluation {
  if (item.status === "RODANDO") return { fleet: item.fleet, state: "NOT_APPLICABLE" };
  if (!item.forecastAt || item.description.toUpperCase().includes("SEM PREVISÃO")) {
    return {
      fleet: item.fleet,
      state: "MISSING",
      alert: { code: "FORECAST_MISSING", severity: "warning", fleet: item.fleet, message: `Frota ${item.fleet} sem previsão.` },
      proposal: missingProposal(item.forecastAt, now)
    };
  }
  const forecastDate = new Date(item.forecastAt);
  if (Number.isNaN(forecastDate.getTime())) {
    return { fleet: item.fleet, state: "MISSING", alert: { code: "INVALID_TIME", severity: "warning", fleet: item.fleet, message: `Previsão inválida para frota ${item.fleet}.` }, proposal: missingProposal(item.forecastAt, now) };
  }
  if (forecastDate.getTime() < now.getTime() && new Date(item.updatedAt).getTime() <= forecastDate.getTime()) {
    return {
      fleet: item.fleet,
      state: "EXPIRED",
      alert: { code: "FORECAST_EXPIRED", severity: "danger", fleet: item.fleet, message: `Previsão vencida para frota ${item.fleet}.`, metadata: { previousForecastAt: item.forecastAt, expiredAt: now.toISOString() } },
      proposal: missingProposal(item.forecastAt, now)
    };
  }
  if (item.startedAt && new Date(item.forecastAt).getTime() < new Date(item.startedAt).getTime()) {
    return { fleet: item.fleet, state: "MISSING", alert: { code: "FORECAST_BEFORE_START", severity: "warning", fleet: item.fleet, message: `Previsão anterior ao início para frota ${item.fleet}.` }, proposal: missingProposal(item.forecastAt, now) };
  }
  return { fleet: item.fleet, state: "VALID" };
}

export function evaluateForecasts(items: OperationStateItem[], now = new Date()) {
  const evaluations = items.map(item => evaluateForecast(item, now));
  return {
    evaluations,
    alerts: evaluations.flatMap(item => item.alert ? [item.alert] : []),
    withoutForecast: items.filter((item, index) => ["MISSING", "EXPIRED"].includes(evaluations[index]?.state ?? "")),
    expired: items.filter((item, index) => evaluations[index]?.state === "EXPIRED")
  };
}

export function normalizeRunningState(): Pick<OperationStateItem, "status" | "description" | "startedAt" | "forecastAt" | "forecastState"> {
  return { status: "RODANDO", description: "RODANDO", startedAt: null, forecastAt: null, forecastState: "NOT_APPLICABLE" };
}

function missingProposal(previousForecastAt: string | null | undefined, now: Date): ForecastEvaluation["proposal"] {
  return {
    forecast: { state: "MISSING", displayValue: "SEM PREVISÃO", mergeCells: true, style: "DANGER" },
    previousForecastAt,
    expiredAt: now.toISOString()
  };
}
