import { evaluateForecasts } from "./forecast-engine.js";
import { OperationStateItem } from "./excel-adapters.js";

export type ReportSchedule = {
  id: string;
  groupId?: string | null;
  groupName: string;
  operation: string;
  messageTemplate: string;
  shift: string;
  specificTimes: string[];
  intervalHours: number;
  startTime: string;
  endTime: string;
  activeDays: number[];
  enabled: boolean;
  requiresApproval: boolean;
  futureAutoSend: boolean;
  testGroup: boolean;
};

export const defaultSchedule: ReportSchedule = {
  id: "plantio-cana-turno-c",
  groupId: null,
  groupName: "Grupo de teste",
  operation: "Plantio de Cana",
  messageTemplate: "Segue acompanhamento do {operacao} – Turno {turno}\n🕗 Atualização: {hora}",
  shift: "C",
  specificTimes: ["02:00"],
  intervalHours: 1,
  startTime: "00:00",
  endTime: "06:00",
  activeDays: [0, 1, 2, 3, 4, 5, 6],
  enabled: false,
  requiresApproval: true,
  futureAutoSend: false,
  testGroup: true
};

export function renderTemplate(template: string, input: { operation: string; shift: string; at?: Date }) {
  const at = input.at ?? new Date();
  const hora = `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}h`;
  const data = at.toLocaleDateString("pt-BR");
  return template
    .replaceAll("{operacao}", input.operation)
    .replaceAll("{turno}", input.shift)
    .replaceAll("{hora}", hora)
    .replaceAll("{data}", data);
}

export function activeReportTimes(schedule: ReportSchedule) {
  const times = new Set(schedule.specificTimes);
  const start = parseMinutes(schedule.startTime);
  const end = parseMinutes(schedule.endTime);
  for (let minute = start; minute <= end; minute += Math.max(1, schedule.intervalHours) * 60) times.add(formatMinutes(minute));
  return [...times].sort();
}

export function buildHourlyReport(schedule: ReportSchedule, items: OperationStateItem[], at = new Date()) {
  const forecast = evaluateForecasts(items, at);
  const lines = [
    renderTemplate(schedule.messageTemplate, { operation: schedule.operation, shift: schedule.shift, at }),
    ""
  ];
  if (forecast.withoutForecast.length) {
    lines.push("⚠️ Frotas sem previsão:");
    lines.push(...forecast.withoutForecast.map(item => `• ${item.fleet} – ${item.description}`));
  }
  return {
    text: lines.join("\n").trimEnd(),
    image: { simulated: true, message: "Imagem simulada ou última imagem disponível no Linux." },
    withoutForecast: forecast.withoutForecast,
    expired: forecast.expired,
    alerts: forecast.alerts,
    summaryIncluded: false,
    sendMessage: false,
    sendReaction: false
  };
}

export function validateSchedule(input: Partial<ReportSchedule>): ReportSchedule {
  const schedule = { ...defaultSchedule, ...input, specificTimes: input.specificTimes ?? defaultSchedule.specificTimes, activeDays: input.activeDays ?? defaultSchedule.activeDays };
  if (!schedule.operation.trim()) throw new Error("OPERATION_REQUIRED");
  if (!schedule.messageTemplate.includes("{operacao}") || !schedule.messageTemplate.includes("{turno}") || !schedule.messageTemplate.includes("{hora}")) throw new Error("REQUIRED_TOKEN_MISSING");
  for (const time of [...schedule.specificTimes, schedule.startTime, schedule.endTime]) if (!/^\d{2}:\d{2}$/.test(time)) throw new Error(`INVALID_TIME:${time}`);
  return schedule;
}

function parseMinutes(time: string) {
  const [h = "0", m = "0"] = time.split(":");
  return Number(h) * 60 + Number(m);
}
function formatMinutes(value: number) {
  return `${String(Math.floor(value / 60) % 24).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
