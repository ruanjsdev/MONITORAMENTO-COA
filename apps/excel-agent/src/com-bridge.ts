import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ExcelAgentCommand, ExcelCommandResult, validateOfficialPilotCommand } from "@coa-bot/excel-contracts";
import { validateDevWorkbook, validateOfficialBackup, validateOfficialPilotWorkbook, validateTempImage } from "./security.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.resolve(here, "../scripts/excel-com.ps1");
const officialTypes = new Set(["PREPARE_OFFICIAL_PILOT", "APPLY_OFFICIAL_PILOT", "ROLLBACK_OFFICIAL_PILOT"]);
let officialWriteRunning = false;

export async function executeComCommand(command: ExcelAgentCommand): Promise<ExcelCommandResult> {
  const started = Date.now();
  const isOfficialWrite = command.type === "APPLY_OFFICIAL_PILOT" || command.type === "ROLLBACK_OFFICIAL_PILOT";
  let dispatched = false;
  try {
    const safe = validateCommand(command);
    if (isOfficialWrite && officialWriteRunning) throw coded("PILOT_WRITE_IN_PROGRESS", "Já existe uma escrita oficial em andamento.");
    if (isOfficialWrite) officialWriteRunning = true;
    dispatched = true;
    const result = await invoke(safe, safe.timeoutMs ?? 60_000);
    return envelope(safe, started, { success: true, result, executed: true });
  } catch (error) {
    const value = error as Error & { code?: string; details?: unknown };
    return envelope(command, started, { success: false, executed: dispatched, error: { code: value.code ?? classify(value.message), message: value.message, details: value.details ?? structuredDetails(value.message) } });
  } finally {
    if (isOfficialWrite) officialWriteRunning = false;
  }
}

export function validateCommand(input: ExcelAgentCommand) {
  let command = input;
  const expiresAt = command.expiresAt ? new Date(command.expiresAt).getTime() : new Date(command.requestedAt).getTime() + (command.timeoutMs ?? 30_000);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) throw coded("COMMAND_EXPIRED", "Comando expirado antes da execução.");
  const officialPilot = officialTypes.has(command.type);
  if (command.workbook) command = { ...command, workbook: officialPilot ? validateOfficialPilotWorkbook(command.workbook) : validateDevWorkbook(command.workbook) };
  if (command.payload.tempPath) command = { ...command, payload: { ...command.payload, tempPath: validateTempImage(command.payload.tempPath) } };
  if (officialPilot) {
    if (!command.payload.backupPath) throw coded("PILOT_BACKUP_REQUIRED", "Backup obrigatório ausente.");
    command = { ...command, payload: { ...command.payload, backupPath: validateOfficialBackup(command.payload.backupPath) } };
    validateOfficialPilotCommand(command);
  }
  if (command.type === "APPLY_CHANGE" && (!command.payload.mappingConfirmed || command.simulation)) throw coded("WRITE_NOT_AUTHORIZED", "Escrita exige homologação ativa, prévia aprovada e mapeamento confirmado.");
  if (command.type === "APPLY_OFFICIAL_PILOT" && command.simulation) throw coded("WRITE_NOT_AUTHORIZED", "Escrita oficial não pode usar envelope de simulação.");
  if (command.type === "APPLY_CHANGE" || command.type === "APPLY_OFFICIAL_PILOT") validateOperationalRules(command);
  if (process.platform !== "win32") throw coded("WINDOWS_REQUIRED", "Automação COM disponível somente no Windows.");
  return command;
}

function validateOperationalRules(command: ExcelAgentCommand) {
  const proposed = command.payload.proposed ?? {};
  const status = String(proposed.status ?? "").trim().toUpperCase();
  if (status === "R") {
    const requiredCells = ["descriptionCell", "startDateCell", "startTimeCell", "forecastDateCell", "forecastTimeCell"] as const;
    if (requiredCells.some(field => !command.payload[field])) throw coded("OPERATIONAL_RULE_VIOLATION", "Status R exige descrição e células de início/previsão mapeadas.");
    if (String(proposed.description ?? "").trim().toUpperCase() !== "RODANDO") throw coded("OPERATIONAL_RULE_VIOLATION", "Status R exige descrição RODANDO.");
    for (const field of ["startDate", "startTime", "forecastDate", "forecastTime"]) if (String(proposed[field] ?? "").trim() !== "") throw coded("OPERATIONAL_RULE_VIOLATION", `Status R exige ${field} vazio.`);
  }
  const hasForecast = String(proposed.forecastDate ?? "").trim() !== "" || String(proposed.forecastTime ?? "").trim() !== "";
  if (hasForecast && (!String(proposed.startDate ?? "").trim() || !String(proposed.startTime ?? "").trim())) throw coded("OPERATIONAL_RULE_VIOLATION", "Previsão exige data e hora de início da ocorrência.");
}

function invoke(command: ExcelAgentCommand, timeout: number) {
  return new Promise<unknown>((resolve, reject) => {
    const encoded = Buffer.from(JSON.stringify(command)).toString("base64");
    const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", script, "-InputBase64", encoded], { windowsHide: true });
    let stdout = "", stderr = "";
    const timer = setTimeout(() => { child.kill(); reject(coded("COMMAND_TIMEOUT", "Comando Excel excedeu o tempo limite.")); }, timeout);
    child.stdout.on("data", data => stdout += data);
    child.stderr.on("data", data => stderr += data);
    child.on("error", reject);
    child.on("close", code => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(stderr.trim() || `PowerShell finalizou com código ${code}.`));
      try { resolve(JSON.parse(stdout.trim())); } catch { reject(new Error(`Resposta COM inválida: ${stdout}`)); }
    });
  });
}

function envelope(command: ExcelAgentCommand, started: number, value: { success: boolean; executed: boolean; result?: unknown; error?: ExcelCommandResult["error"] }): ExcelCommandResult {
  const officialWorkbookTouched = officialTypes.has(command.type) && value.executed;
  return { commandId: command.commandId, correlationId: command.correlationId, type: command.type, success: value.success, result: value.result, error: value.error, duration: Date.now() - started, completedAt: new Date().toISOString(), simulation: command.simulation, executed: value.executed, macrosExecuted: false, officialWorkbookTouched };
}

function classify(message: string) {
  for (const code of ["CELL_CONFLICT", "ROW_CONFLICT", "WORKBOOK_CONFLICT", "ROLLBACK_CONFLICT", "AMBIGUOUS_MATCH", "FORMULA_PROTECTED", "MERGED_CELL_OUTSIDE_WHITELIST", "FILE_LOCKED", "PILOT_BASELINE_STATUS_BLOCKED", "WRITE_SAVE_FAILED", "WRITE_VERIFICATION_FAILED", "BACKUP_HASH_MISMATCH", "BACKUP_ALREADY_EXISTS", "WORKBOOK_READ_ONLY", "WORKBOOK_UNSAVED"]) if (message.includes(code)) return code;
  return "EXCEL_COMMAND_FAILED";
}

function coded(code: string, message: string) { return Object.assign(new Error(message), { code }); }

function structuredDetails(message: string) {
  const conflict = message.match(/(CELL_CONFLICT):([^|\r\n]+)\|([^|\r\n]*)\|([^|\r\n]*)\|([^\r\n]*)/);
  if (conflict) return { cell: conflict[2], previewValue: conflict[3], currentValue: conflict[4], proposedValue: conflict[5] };
  const row = message.match(/(ROW_CONFLICT):([^|\r\n]+)\|([^\r\n]+)/);
  if (row) return { previewRow: row[2], currentRow: row[3] };
  const rollback = message.match(/(ROLLBACK_CONFLICT):([^|\r\n]+)\|([^\r\n]+)/);
  if (rollback) return { expectedCurrentHash: rollback[2], currentHash: rollback[3] };
  const workbook = message.match(/(WORKBOOK_CONFLICT):([^|\r\n]+)\|([^\r\n]+)/);
  if (workbook) return { expectedWorkbookHash: workbook[2], currentWorkbookHash: workbook[3] };
  const writeFailure = message.match(/(WRITE_SAVE_FAILED|WRITE_VERIFICATION_FAILED):([a-f\d]{64})\|([^\r\n]+)/i);
  if (writeFailure) return { writtenHash: writeFailure[2], detail: writeFailure[3] };
  return undefined;
}
