import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  ExcelAgentCommand,
  OFFICIAL_PILOT_ACTIVATION,
  OFFICIAL_PILOT_ROLLBACK_CONFIRMATION,
  OFFICIAL_PILOT_WRITE_CONFIRMATION,
  officialPilotAddresses,
  compareOfficialPilotValues,
  validateOfficialPilotCommand
} from "@coa-bot/excel-contracts";
import { firstPilotProposalBlockers, pilotProposedValues, pilotScopeBlockers } from "../apps/api/src/modules/official-pilot/policy";
import { officialBackupRoot, validateOfficialBackup } from "../apps/excel-agent/src/security";
import { validateExcelResultEnvelope } from "../apps/api/src/modules/excel-homologation/routes";

const testPilotGroupJid = "120363000000000000@g.us";
const previousPilotGroupJid = process.env.OFFICIAL_PILOT_GROUP_JID;
process.env.OFFICIAL_PILOT_GROUP_JID = testPilotGroupJid;

afterAll(() => {
  if (previousPilotGroupJid === undefined) delete process.env.OFFICIAL_PILOT_GROUP_JID;
  else process.env.OFFICIAL_PILOT_GROUP_JID = previousPilotGroupJid;
});

function applyCommand(overrides: Partial<ExcelAgentCommand> = {}): ExcelAgentCommand {
  const cells = officialPilotAddresses(12);
  const fields = ["status", "startDate", "startTime", "forecastDate", "forecastTime", "description"];
  return {
    commandId: randomUUID(), correlationId: randomUUID(), requestedAt: new Date().toISOString(), requestedBy: "test",
    type: "APPLY_OFFICIAL_PILOT", workbook: "Planilha Plantio cana.xlsm", worksheet: "PLANTIO", simulation: false,
    payload: { fleet: "1531", implement: "830", row: 12, statusCell: cells.status, startDateCell: cells.startDate, startTimeCell: cells.startTime, forecastDateCell: cells.forecastDate, forecastTimeCell: cells.forecastTime, descriptionCell: cells.description, expectedCurrent: { status: "P", startDate: "13/07/2026", startTime: "01:00", forecastDate: "13/07/2026", forecastTime: "02:00", description: "PARADA" }, proposed: { status: "R", startDate: "", startTime: "", forecastDate: "", forecastTime: "", description: "RODANDO" }, editableFields: fields, backupPath: path.join(officialBackupRoot, "test.xlsm"), backupHash: "A".repeat(64), expectedWorkbookHash: "A".repeat(64), confirmation: OFFICIAL_PILOT_WRITE_CONFIRMATION },
    ...overrides
  };
}

describe("política do primeiro piloto oficial", () => {
  const allowed = { groupName: "Anotar apenas kk ", groupJid: testPilotGroupJid, operation: "Plantio Mecanizado", workbook: "P:\\x\\Planilha Plantio cana.xlsm", worksheet: "PLANTIO", fleet: "1531", implement: "830", columns: ["H", "K", "L", "M", "N", "S"] };
  it("aceita somente o escopo explicitamente autorizado", () => expect(pilotScopeBlockers(allowed)).toEqual([]));
  it("exige a frase exata para ativar o modo intermediário", () => expect(OFFICIAL_PILOT_ACTIVATION).toBe("ATIVAR PILOTO OFICIAL PLANTIO"));
  it.each([
    ["outro grupo", { groupJid: "outro@g.us" }, "PILOT_GROUP_BLOCKED"],
    ["outra operação", { operation: "Preparo de Solo" }, "PILOT_OPERATION_BLOCKED"],
    ["outra frota", { fleet: "164" }, "PILOT_FLEET_BLOCKED"],
    ["outro implemento", { implement: "999" }, "PILOT_IMPLEMENT_BLOCKED"],
    ["outra coluna", { columns: ["H", "K", "L", "M", "N", "T"] }, "PILOT_COLUMNS_BLOCKED"]
  ])("bloqueia %s", (_label, change, code) => expect(pilotScopeBlockers({ ...allowed, ...change })).toContain(code));
  it("sem frase final não autoriza escrita", () => expect(() => validateOfficialPilotCommand(applyCommand({ payload: { ...applyCommand().payload, confirmation: "CONFIRMO" } }))).toThrow(/Confirmação exigida/));
  it("bloqueia célula fora de H K L M N S", () => expect(() => validateOfficialPilotCommand(applyCommand({ payload: { ...applyCommand().payload, descriptionCell: "T12" } }))).toThrow(/Célula não autorizada/));
  it("aceita somente a confirmação exata da escrita", () => expect(() => validateOfficialPilotCommand(applyCommand())).not.toThrow());
  it("bloqueia escrita se o status oficial da prévia não for P", () => expect(() => validateOfficialPilotCommand(applyCommand({ payload: { ...applyCommand().payload, expectedCurrent: { ...applyCommand().payload.expectedCurrent, status: "D" } } }))).toThrow(/deve estar em P/));
  it("exige o hash integral do workbook apresentado na prévia", () => expect(() => validateOfficialPilotCommand(applyCommand({ payload: { ...applyCommand().payload, expectedWorkbookHash: undefined } }))).toThrow(/Hash SHA-256 integral/));
  it("rejeita resultado forjado com correlação diferente", () => {
    const command = applyCommand();
    const result = { commandId: command.commandId, correlationId: "forjada", type: command.type, success: true, result: { saved: true, verified: true, values: command.payload.proposed, writtenHash: "B".repeat(64) }, duration: 1, completedAt: new Date().toISOString(), simulation: false, executed: true, macrosExecuted: false, officialWorkbookTouched: true };
    expect(() => validateExcelResultEnvelope(result, command)).toThrow(/inválido/);
    expect(() => validateExcelResultEnvelope({ ...result, correlationId: command.correlationId }, command)).not.toThrow();
  });
  it("rollback exige confirmação humana exata", () => {
    const rollback = applyCommand({ type: "ROLLBACK_OFFICIAL_PILOT", payload: { fleet: "1531", implement: "830", backupHash: "A".repeat(64), expectedCurrentHash: "A".repeat(64), confirmation: OFFICIAL_PILOT_ROLLBACK_CONFIRMATION } });
    expect(() => validateOfficialPilotCommand(rollback)).not.toThrow();
    expect(() => validateOfficialPilotCommand({ ...rollback, payload: { ...rollback.payload, confirmation: "restaurar" } })).toThrow(/Confirmação exigida/);
  });
  it("status R força RODANDO e limpa todas as datas", () => expect(pilotProposedValues({ status: "R", description: "qualquer", startDate: "13/07/2026", startTime: "00:31", forecastDate: "13/07/2026", forecastTime: "12:00" })).toEqual({ status: "R", description: "RODANDO", startDate: "", startTime: "", forecastDate: "", forecastTime: "" }));
  it("limita o primeiro piloto à proposta real P para R em WHATSAPP_SHADOW", () => {
    const proposal = { currentStatus: "P", newStatus: "R", description: "RODANDO", pendingStatus: "PENDING", source: "WHATSAPP_SHADOW", normalized: { status: "R", description: "RODANDO", startDate: null, startTime: null, forecastDate: null, forecastTime: null } };
    expect(firstPilotProposalBlockers(proposal)).toEqual([]);
    expect(firstPilotProposalBlockers({ ...proposal, currentStatus: "D" })).toContain("PILOT_TRANSITION_BLOCKED");
    expect(firstPilotProposalBlockers({ ...proposal, source: "SIMULATION" })).toContain("PILOT_SOURCE_BLOCKED");
  });
  it("falha a validação quando a releitura diverge", () => expect(compareOfficialPilotValues({ status: "R", description: "RODANDO", startDate: "", startTime: "", forecastDate: "", forecastTime: "" }, { status: "R", description: "OUTRO", startDate: null, startTime: null, forecastDate: null, forecastTime: null })).toEqual([{ field: "description", expected: "RODANDO", actual: "OUTRO" }]));
  it("backup só pode ficar fora do Git na raiz dedicada", () => { expect(validateOfficialBackup(path.join(officialBackupRoot, "2026-07-13", "backup.xlsm"))).toContain("backups-excel"); expect(() => validateOfficialBackup(path.resolve("backup.xlsm"))).toThrow(); });
  it("script COM contém backup, baseline, releitura, rollback e bloqueio de macro", async () => {
    const script = await readFile(path.resolve("apps/excel-agent/scripts/excel-com.ps1"), "utf8");
    for (const marker of ["BACKUP_HASH_MISMATCH", "CELL_CONFLICT", "WRITE_VERIFICATION_FAILED", "ROLLBACK_VERIFICATION_FAILED", "AutomationSecurity = 3", "EnableEvents=$previousEnableEvents", "$workbook.Save()"] ) expect(script).toContain(marker);
    expect(script).not.toContain("SaveAs");
  });
});
