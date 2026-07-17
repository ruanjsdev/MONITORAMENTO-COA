import { describe, expect, it } from "vitest";
import { MockOperationalExcelAdapter } from "../apps/api/src/services/reports/excel-adapters";
import { evaluateForecast, normalizeRunningState } from "../apps/api/src/services/reports/forecast-engine";
import { activeReportTimes, buildHourlyReport, defaultSchedule, renderTemplate, validateSchedule } from "../apps/api/src/services/reports/report-scheduler";

const at = new Date(2026, 6, 13, 2, 0, 0);

describe("motor de relatórios e previsões", () => {
  it("renderiza mensagem personalizada com tokens", () => {
    expect(renderTemplate("Segue {operacao} Turno {turno} {hora} {data}", { operation: "Plantio", shift: "C", at })).toContain("Plantio Turno C 02:00h");
  });

  it("gera horários por intervalo e horários específicos", () => {
    const schedule = validateSchedule({ ...defaultSchedule, specificTimes: ["02:30"], startTime: "01:00", endTime: "03:00", intervalHours: 1 });
    expect(activeReportTimes(schedule)).toEqual(["01:00", "02:00", "02:30", "03:00"]);
  });

  it("gera relatório horário sem resumo operacional e com frotas sem previsão", async () => {
    const state = await new MockOperationalExcelAdapter().readOperationState({ operation: "Plantio de Cana" });
    const report = buildHourlyReport(defaultSchedule, state.items, at);
    expect(report.summaryIncluded).toBe(false);
    expect(report.text).toContain("⚠️ Frotas sem previsão:");
    expect(report.text).toContain("164");
    expect(report.sendMessage).toBe(false);
  });

  it("não inclui bloco de sem previsão quando não houver frotas", () => {
    const report = buildHourlyReport(defaultSchedule, [{ operation: "Plantio de Cana", fleet: "1531", implement: "830", status: "RODANDO", description: "RODANDO", startedAt: null, forecastAt: null, forecastState: "NOT_APPLICABLE", updatedAt: at.toISOString(), history: [] }], at);
    expect(report.text).not.toContain("Frotas sem previsão");
  });

  it("classifica previsão válida, ausente, vencida e rodando", () => {
    const base = { operation: "Plantio de Cana", fleet: "1", implement: "1", status: "PARADO" as const, description: "QUEBRADO", startedAt: new Date(2026, 6, 13, 0, 0, 0).toISOString(), updatedAt: new Date(2026, 6, 13, 0, 0, 0).toISOString(), history: [] };
    expect(evaluateForecast({ ...base, forecastAt: new Date(2026, 6, 13, 3, 0, 0).toISOString(), forecastState: "VALID" }, at).state).toBe("VALID");
    expect(evaluateForecast({ ...base, forecastAt: null, forecastState: "MISSING" }, at).state).toBe("MISSING");
    expect(evaluateForecast({ ...base, forecastAt: new Date(2026, 6, 13, 1, 0, 0).toISOString(), forecastState: "VALID" }, at).state).toBe("EXPIRED");
    expect(evaluateForecast({ ...base, ...normalizeRunningState(), forecastState: "NOT_APPLICABLE" }, at).state).toBe("NOT_APPLICABLE");
  });

  it("mock prepara SEM PREVISÃO no contrato de escrita", async () => {
    const preview = await new MockOperationalExcelAdapter().prepareChanges({ operation: "Plantio de Cana", fleet: "164", proposed: { forecastState: "MISSING" } });
    expect(preview.proposed.forecast).toEqual({ state: "MISSING", displayValue: "SEM PREVISÃO", mergeCells: true, style: "DANGER" });
  });
});
