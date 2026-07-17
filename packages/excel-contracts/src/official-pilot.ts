import type { ExcelAgentCommand } from "./index.js";

export const OFFICIAL_PILOT_ACTIVATION = "ATIVAR PILOTO OFICIAL PLANTIO";
export const OFFICIAL_PILOT_WRITE_CONFIRMATION = "CONFIRMO ESCRITA OFICIAL FROTA 1531";
export const OFFICIAL_PILOT_ROLLBACK_CONFIRMATION = "CONFIRMO RESTAURAR BACKUP";

export const OFFICIAL_PILOT_POLICY = Object.freeze({
  groupName: "Anotar apenas kk",
  operation: "Plantio Mecanizado",
  workbookName: "Planilha Plantio cana.xlsm",
  worksheet: "PLANTIO",
  fleet: "1531",
  implement: "830",
  headerRow: 7,
  fleetColumn: "F",
  implementColumn: "G",
  columns: Object.freeze({ status: "H", startDate: "K", startTime: "L", forecastDate: "M", forecastTime: "N", description: "S" })
});

export const OFFICIAL_PILOT_FIELDS = Object.freeze(["status", "startDate", "startTime", "forecastDate", "forecastTime", "description"] as const);
export type OfficialPilotField = typeof OFFICIAL_PILOT_FIELDS[number];

export function officialPilotAddresses(row: number): Record<OfficialPilotField, string> {
  const columns = OFFICIAL_PILOT_POLICY.columns;
  return { status: `${columns.status}${row}`, startDate: `${columns.startDate}${row}`, startTime: `${columns.startTime}${row}`, forecastDate: `${columns.forecastDate}${row}`, forecastTime: `${columns.forecastTime}${row}`, description: `${columns.description}${row}` };
}

export function validateOfficialPilotCommand(command: ExcelAgentCommand): void {
  const policy = OFFICIAL_PILOT_POLICY;
  if (command.worksheet !== policy.worksheet) throw pilotError("PILOT_WORKSHEET_BLOCKED", "Aba fora da lista branca do piloto.");
  if (String(command.payload.fleet ?? "") !== policy.fleet) throw pilotError("PILOT_FLEET_BLOCKED", "Frota fora da lista branca do piloto.");
  if (String(command.payload.implement ?? "") !== policy.implement) throw pilotError("PILOT_IMPLEMENT_BLOCKED", "Implemento fora da lista branca do piloto.");
  if (!validSha256(command.payload.backupHash) && command.type !== "PREPARE_OFFICIAL_PILOT") throw pilotError("PILOT_BACKUP_HASH_REQUIRED", "Hash SHA-256 do backup é obrigatório.");
  if (command.type === "PREPARE_OFFICIAL_PILOT") return;
  if (command.type === "ROLLBACK_OFFICIAL_PILOT") {
    if (command.payload.confirmation !== OFFICIAL_PILOT_ROLLBACK_CONFIRMATION) throw pilotError("PILOT_ROLLBACK_CONFIRMATION_REQUIRED", `Confirmação exigida: ${OFFICIAL_PILOT_ROLLBACK_CONFIRMATION}`);
    if (!validSha256(command.payload.expectedCurrentHash)) throw pilotError("PILOT_ROLLBACK_HASH_REQUIRED", "Hash SHA-256 pós-escrita obrigatório para rollback.");
    return;
  }
  if (!Number.isInteger(command.payload.row) || Number(command.payload.row) <= policy.headerRow) throw pilotError("PILOT_ROW_INVALID", "Linha do piloto inválida.");
  const addresses = officialPilotAddresses(Number(command.payload.row));
  const cells: Record<OfficialPilotField, string | undefined> = { status: command.payload.statusCell, startDate: command.payload.startDateCell, startTime: command.payload.startTimeCell, forecastDate: command.payload.forecastDateCell, forecastTime: command.payload.forecastTimeCell, description: command.payload.descriptionCell };
  for (const field of OFFICIAL_PILOT_FIELDS) if (cells[field] !== addresses[field]) throw pilotError("PILOT_CELL_BLOCKED", `Célula não autorizada: ${cells[field] ?? field}.`);
  const keys = Object.keys(command.payload.proposed ?? {});
  if (keys.length !== OFFICIAL_PILOT_FIELDS.length || keys.some(key => !OFFICIAL_PILOT_FIELDS.includes(key as OfficialPilotField))) throw pilotError("PILOT_FIELD_BLOCKED", "A escrita contém campos fora da lista branca.");
  const expectedKeys = Object.keys(command.payload.expectedCurrent ?? {});
  if (expectedKeys.length !== OFFICIAL_PILOT_FIELDS.length || expectedKeys.some(key => !OFFICIAL_PILOT_FIELDS.includes(key as OfficialPilotField))) throw pilotError("PILOT_BASELINE_INVALID", "Baseline deve conter exatamente os seis campos autorizados.");
  const editableFields = command.payload.editableFields;
  if (!Array.isArray(editableFields) || editableFields.length !== OFFICIAL_PILOT_FIELDS.length || editableFields.some(field => !OFFICIAL_PILOT_FIELDS.includes(field as OfficialPilotField))) throw pilotError("PILOT_FIELD_BLOCKED", "Campos editáveis divergem da lista branca.");
  if (String(command.payload.expectedCurrent?.status ?? "").trim().toUpperCase() !== "P") throw pilotError("PILOT_BASELINE_STATUS_BLOCKED", "A célula oficial de status deve estar em P na prévia.");
  const proposed = command.payload.proposed ?? {};
  if (String(proposed.status ?? "").trim().toUpperCase() !== "R" || String(proposed.description ?? "").trim().toUpperCase() !== "RODANDO" || [proposed.startDate, proposed.startTime, proposed.forecastDate, proposed.forecastTime].some(value => String(value ?? "").trim() !== "")) throw pilotError("PILOT_PROPOSAL_BLOCKED", "O primeiro piloto permite somente P para R, descrição RODANDO e datas vazias.");
  if (!validSha256(command.payload.expectedWorkbookHash)) throw pilotError("PILOT_WORKBOOK_HASH_REQUIRED", "Hash SHA-256 integral apresentado na prévia é obrigatório.");
  if (command.type === "APPLY_OFFICIAL_PILOT" && command.payload.confirmation !== OFFICIAL_PILOT_WRITE_CONFIRMATION) throw pilotError("PILOT_CONFIRMATION_REQUIRED", `Confirmação exigida: ${OFFICIAL_PILOT_WRITE_CONFIRMATION}`);
}

export function compareOfficialPilotValues(expected: Record<string, unknown>, actual: Record<string, unknown>) {
  return OFFICIAL_PILOT_FIELDS.flatMap(field => valuesEqual(expected[field], actual[field]) ? [] : [{ field, expected: expected[field] ?? null, actual: actual[field] ?? null }]);
}

function valuesEqual(left: unknown, right: unknown) {
  if ((left === null || left === undefined || left === "") && (right === null || right === undefined || right === "")) return true;
  if (typeof left === "number" && typeof right === "number") return Math.abs(left - right) < 0.000000001;
  return String(left) === String(right);
}

function pilotError(code: string, message: string) { return Object.assign(new Error(message), { code }); }

function validSha256(value: unknown) { return /^[a-f\d]{64}$/i.test(String(value ?? "")); }
