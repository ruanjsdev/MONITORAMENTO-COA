import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  GroupCard
} from "../apps/web/src/components/groups/GroupCard";
import { OperationCard } from "../apps/web/src/components/operations/OperationCard";
import { SpreadsheetCard } from "../apps/web/src/components/spreadsheets/SpreadsheetCard";
import { TechnicalDetails } from "../apps/web/src/components/common/TechnicalDetails";
import { TestResultPanel } from "../apps/web/src/components/tests/TestResultPanel";
import { Operation, WhatsAppGroup } from "@coa-bot/shared";
import { MessageState } from "../apps/web/src/pages/DashboardPage";

const group: WhatsAppGroup = {
  id: "group_1",
  name: "COA Teste",
  externalId: "123@g.us",
  description: "Grupo de teste",
  isActive: true,
  isMonitored: true,
  receivesReports: true,
  allowTests: true,
  allowedHours: "00:00-23:59",
  notes: "",
  operationIds: ["op_plantio"],
  defaultMessage: "Teste",
  lastMessage: "Frota 625 parada",
  lastActivity: "2026-07-11T10:00:00.000Z",
  processedMessages: 12,
  connectionStatus: "simulated",
  isTestGroup: true
};

const operation: Operation = {
  id: "op_plantio",
  name: "Plantio Mecanizado",
  shortName: "Plantio",
  emoji: "🚜",
  description: "Operação de plantio",
  spreadsheetFile: "Planilha Plantio cana.xlsm",
  sheetName: "PLANTIO",
  groupIds: ["group_1"],
  destinationGroupId: "group_1",
  allowedStatuses: ["RODANDO", "PARADO"],
  synonyms: "",
  shifts: ["A", "B", "C"],
  reportTimes: "05:45",
  legendTemplate: "{resumo}",
  requiresApproval: true,
  imageRange: "A1:AI26",
  fleetColumn: "F",
  implementColumn: "G",
  statusColumn: "H",
  descriptionColumn: "S",
  timeColumn: "L",
  fleetCount: 8,
  automaticReport: false,
  monitor: true,
  status: "active",
  lastUpdate: "2026-07-11T10:00:00.000Z"
};

const spreadsheet = {
  file: "Planilha Plantio cana.xlsm",
  path: "/planilhas/Planilha Plantio cana.xlsm",
  sizeBytes: 1556609,
  sheetCount: 6,
  sheets: ["PLANTIO"],
  sheetDetails: [
    {
      name: "PLANTIO",
      state: "visible",
      dimension: "A1:AI26",
      formulas: 34,
      mergedCells: 28,
      protected: false,
      candidateColumns: {},
      candidateImageArea: "A1:AI26"
    }
  ],
  hiddenSheets: 1,
  macrosDetected: true,
  externalLinksDetected: true,
  linkedOperations: ["Plantio Mecanizado"],
  risks: ["Arquivo contem projeto VBA/macros"],
  analysisState: "analisado",
  excelAgentStatus: "simulated",
  lastAnalysis: "2026-07-11T10:00:00.000Z"
};

describe("telas visuais do painel", () => {
  it("renderiza card de grupo sem usar JSON bruto como interface principal", () => {
    const html = renderToString(<GroupCard group={group} operationsLabel="Plantio Mecanizado" />);
    expect(html).toContain("COA Teste");
    expect(html).toContain("Monitoramento");
    expect(html).toContain("Mensagens processadas");
    expect(html).not.toContain("{&quot;id&quot;");
  });

  it("renderiza operação com configuração operacional", () => {
    const html = renderToString(<OperationCard operation={operation} />);
    expect(html).toContain("Plantio Mecanizado");
    expect(html).toContain("Planilha Plantio cana.xlsm");
    expect(html).toContain("Status permitidos");
  });

  it("renderiza card de planilha com riscos e detalhes resumidos", () => {
    const html = renderToString(<SpreadsheetCard file={spreadsheet} />);
    expect(html).toContain("Planilha Plantio cana.xlsm");
    expect(html).toContain("Macros");
    expect(html).toContain("Riscos");
  });

  it("mantem JSON tecnico recolhido por padrao", () => {
    const html = renderToString(<TechnicalDetails data={{ raw: true }} />);
    expect(html).toContain("Ver dados técnicos");
    expect(html).toContain("<details");
    expect(html).not.toContain("open=");
  });

  it("renderiza resultado da central de testes como simulado", () => {
    const html = renderToString(
      <TestResultPanel
        result={{
          simulated: true,
          action: "gerar previa",
          title: "SIMULADO: gerar previa",
          operation: "Plantio Mecanizado",
          group: "COA Teste",
          shift: "C",
          usedAt: "2026-07-11T10:00:00.000Z",
          spreadsheet: "Planilha Plantio cana.xlsm",
          sheet: "PLANTIO",
          range: "A1:AI26",
          logs: ["SIMULADO: nenhuma mensagem real foi enviada."]
        }}
      />
    );
    expect(html).toContain("SIMULADO");
    expect(html).toContain("Logs do teste");
    expect(html).toContain("A1:AI26");
  });

  it("apresenta estados operacionais sem usar reacao de WhatsApp", () => {
    const pending = renderToString(<MessageState status="PENDING_APPROVAL" />);
    const failed = renderToString(<MessageState status="FAILED" />);
    expect(pending).toContain("Aguardando aprovação");
    expect(failed).toContain("Falhou");
    expect(pending).not.toContain("👍");
  });
});
