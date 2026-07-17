import { describe, expect, it } from "vitest";
import {
  mapAvailableGroups,
  maskJid,
  requireConnectedWhatsApp,
  resolveAuditUserId,
  searchAvailableGroups,
  selectSingleGroup,
  shadowGroupPersistence,
  shouldCaptureShadowMessage
} from "../apps/api/src/modules/whatsapp-shadow/group-policy";
import { parseReport } from "../apps/api/src/services/operational-parser";
import {
  detectOperationalChange,
  resolveExcelStatus,
  resolveOperationForFleet,
  validateFleetAgainstExcel
} from "../apps/api/src/modules/whatsapp-shadow/routes";
import { normalizeOperationalExcelUpdate } from "@coa-bot/excel-contracts";

const groups = [
  { externalId: "120363001@g.us", name: "COA Plantio", participantCount: 12 },
  { externalId: "120363002@g.us", name: "Oficina", participantCount: 8 }
];

describe("seleção de grupos WhatsApp em SHADOW", () => {
  it("carrega grupos reais com quantidade de participantes", () =>
    expect(
      mapAvailableGroups([{ id: "120363001@g.us", subject: "COA Plantio", participants: [{}, {}] }])
    ).toEqual([{ externalId: "120363001@g.us", name: "COA Plantio", participantCount: 2 }]));
  it("pesquisa grupo por nome", () =>
    expect(searchAvailableGroups(groups, "plantio").map((group) => group.name)).toEqual([
      "COA Plantio"
    ]));
  it("seleciona somente um grupo", () =>
    expect(
      selectSingleGroup(groups, "120363002@g.us").filter((group) => group.selected)
    ).toHaveLength(1));
  it("persiste o JID e as travas do piloto", () =>
    expect(shadowGroupPersistence("120363001@g.us")).toMatchObject({
      externalId: "120363001@g.us",
      isActive: true,
      isMonitored: true,
      receivesReports: false,
      isTestGroup: true
    }));
  it("ignora grupos não selecionados", () =>
    expect(shouldCaptureShadowMessage("120363001@g.us", "120363002@g.us")).toBe(false));
  it("captura mensagem somente do grupo monitorado", () =>
    expect(shouldCaptureShadowMessage("120363001@g.us", "120363001@g.us")).toBe(true));
  it("impede seleção com WhatsApp desconectado", () =>
    expect(() => requireConnectedWhatsApp("OFFLINE")).toThrow("WHATSAPP_DISCONNECTED"));
  it("oculta parcialmente o JID", () => expect(maskJid("120363001@g.us")).toBe("1203••••001@g.us"));
  it("resolve o usuário real do PostgreSQL pelo e-mail mesmo com token antigo", async () =>
    expect(
      await resolveAuditUserId(
        { user: { findUnique: async () => ({ id: "db-user-id" }) } },
        "admin@coa.local"
      )
    ).toBe("db-user-id"));
  it("parser real cria duas propostas para o relatório capturado", () => {
    const report = parseReport(
      "Plantio Mecanizado\n\n1531/830 = rodando\n164 = parado, problema mecânico, previsão 13/07 às 12:00"
    );
    expect(report.items.map((item) => item.mainEquipment)).toEqual(["1531", "164"]);
    expect(report.items.map((item) => item.proposedStatus)).toEqual(["RODANDO", "PARADO"]);
  });
  it("proposta R limpa datas e previsão parada recebe início", () => {
    const running = normalizeOperationalExcelUpdate({
      status: "R",
      receivedAt: "2026-07-13T03:31:49Z"
    });
    const stopped = normalizeOperationalExcelUpdate({
      status: "P",
      description: "PROBLEMA MECÂNICO",
      receivedAt: "2026-07-13T03:31:49Z",
      forecastAt: "2026-07-13T15:00:00Z",
      forecastInformed: true
    });
    expect(running).toMatchObject({ description: "RODANDO", startDate: null, forecastDate: null });
    expect(stopped).toMatchObject({
      valid: true,
      startDate: "13/07/2026",
      startTime: "00:31",
      forecastTime: "12:00"
    });
  });
  it("resolve a operação pela frota real do Excel antes do padrão do grupo", () => {
    expect(
      resolveOperationForFleet({
        explicitOperation: null,
        fleet: "1701",
        excelFleets: [{ fleet: "1701", operation: "Preparo de Solo" }],
        groupOperation: "Plantio Mecanizado"
      })
    ).toEqual({ operation: "Preparo de Solo", source: "EXCEL" });
  });
  it("preserva o status real do Excel quando o relatório informa apenas aguardando área", () => {
    expect(
      resolveExcelStatus(
        { proposedStatus: null, operationalSituation: "AGUARDANDO_AREA" },
        { status: "D" }
      )
    ).toEqual({ status: "D", source: "EXCEL_CURRENT_STATUS_PRESERVED" });
  });
  it("bloqueia pendência de frota inexistente ou em operação diferente", () => {
    expect(
      validateFleetAgainstExcel({
        snapshotAvailable: true,
        matches: [],
        operation: "Preparo de Solo",
        informedImplements: []
      }).state
    ).toBe("FLEET_NOT_FOUND");
    expect(
      validateFleetAgainstExcel({
        snapshotAvailable: true,
        matches: [realFleet({ operation: "Plantio Mecanizado" })],
        operation: "Preparo de Solo",
        informedImplements: ["1095"]
      }).state
    ).toBe("OPERATION_MISMATCH");
  });
  it("não cria alteração quando status e descrição já conferem com o Excel", () => {
    const current = realFleet({ status: "RODANDO", description: "RODANDO" });
    expect(
      detectOperationalChange(
        normalizeOperationalExcelUpdate({ status: "R", receivedAt: "2026-07-16T21:00:00Z" }),
        current
      )
    ).toEqual({ changed: false, reasons: [] });
    expect(
      detectOperationalChange(
        normalizeOperationalExcelUpdate({
          status: "D",
          description: "AG / ÁREA",
          receivedAt: "2026-07-16T21:00:00Z"
        }),
        realFleet({ status: "D", description: "AG. ÁREA" })
      )
    ).toEqual({ changed: false, reasons: [] });
  });
});

function realFleet(
  overrides: Partial<Parameters<typeof validateFleetAgainstExcel>[0]["matches"][number]> = {}
) {
  return {
    fleet: "1603",
    implement: "1095 - SUBSOLADOR",
    status: "D",
    description: "AG. ÁREA",
    operation: "Preparo de Solo",
    sector: "K1",
    updatedAt: "2026-07-16T00:00:00.000Z",
    stoppedMinutes: 0,
    stopMetrics: {
      todayMinutes: 0,
      shiftMinutes: 0,
      weekMinutes: 0,
      stopCount: 0,
      longestMinutes: 0
    },
    ...overrides
  };
}
