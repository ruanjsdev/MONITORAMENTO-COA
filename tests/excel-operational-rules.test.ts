import { describe, expect, it } from "vitest";
import { normalizeOperationalExcelUpdate } from "@coa-bot/excel-contracts";

describe("regras operacionais do Excel", () => {
  it("força RODANDO e limpa início e previsão para status R", () => {
    const result = normalizeOperationalExcelUpdate({ status: "r", description: "quebra", receivedAt: "2026-07-12T23:59:00-03:00", startAt: "12/07/2026 20:00", forecastAt: "13/07/2026 10:00", forecastInformed: true });
    expect(result).toMatchObject({ valid: true, status: "R", description: "RODANDO", startDate: null, startTime: null, forecastDate: null, forecastTime: null });
    expect(result.clearedFields).toEqual(["startDate", "startTime", "forecastDate", "forecastTime"]);
  });

  it("usa o timestamp real de recebimento quando o início não foi informado", () => {
    expect(normalizeOperationalExcelUpdate({ status: "P", description: "pneu furado", receivedAt: "2026-07-12T23:35:00-03:00" })).toMatchObject({ valid: true, startDate: "12/07/2026", startTime: "23:35", forecastDate: null });
  });

  it("preserva início informado em data brasileira sem inverter dia e mês", () => {
    expect(normalizeOperationalExcelUpdate({ status: "D", description: "aguardando área", receivedAt: "2026-07-12T10:00:00-03:00", startAt: "09/07/2026 04:05" })).toMatchObject({ valid: true, startDate: "09/07/2026", startTime: "04:05" });
  });

  it("bloqueia previsão inventada e previsão anterior ao início", () => {
    const invented = normalizeOperationalExcelUpdate({ status: "P", description: "falha", receivedAt: "12/07/2026 10:00", forecastAt: "12/07/2026 12:00" });
    expect(invented.errors).toContain("FORECAST_NOT_INFORMED");
    const past = normalizeOperationalExcelUpdate({ status: "P", description: "falha", receivedAt: "12/07/2026 10:00", forecastAt: "12/07/2026 09:00", forecastInformed: true });
    expect(past.errors).toContain("FORECAST_BEFORE_START");
  });

  it("aceita previsão informada e garante início pelo recebimento", () => {
    expect(normalizeOperationalExcelUpdate({ status: "P", description: "falha", receivedAt: "12/07/2026 23:59", forecastAt: "13/07/2026 00:30", forecastInformed: true })).toMatchObject({ valid: true, startDate: "12/07/2026", startTime: "23:59", forecastDate: "13/07/2026", forecastTime: "00:30" });
  });

  it("respeita timezone e mudança de dia", () => {
    expect(normalizeOperationalExcelUpdate({ status: "P", description: "falha", receivedAt: "2026-07-13T02:30:00Z" })).toMatchObject({ startDate: "12/07/2026", startTime: "23:30" });
  });

  it("rejeita valores vazios e status desconhecido", () => {
    const result = normalizeOperationalExcelUpdate({ status: "X", description: "", receivedAt: "inválido" });
    expect(result.errors).toEqual(expect.arrayContaining(["STATUS_UNKNOWN", "INVALID_RECEIVED_AT", "OCCURRENCE_DESCRIPTION_REQUIRED"]));
  });
});
