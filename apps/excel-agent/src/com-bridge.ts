import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ExcelAgentCommand, ExcelCommandResult } from "@coa-bot/excel-contracts";
import { validateDevWorkbook, validateTempImage } from "./security.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.resolve(here, "../scripts/excel-com.ps1");

export async function executeComCommand(command: ExcelAgentCommand): Promise<ExcelCommandResult> {
  const started = Date.now();
  try {
    const safe = validateCommand(command);
    const result = await invoke(safe, safe.timeoutMs ?? 30_000);
    return envelope(safe, started, { success: true, result, executed: true });
  } catch (error) {
    const value = error as Error & { code?: string; details?: unknown };
    return envelope(command, started, { success: false, executed: false, error: { code: value.code ?? classify(value.message), message: value.message, details: value.details } });
  }
}

function validateCommand(input: ExcelAgentCommand) {
  let command = input;
  if (command.workbook) command = { ...command, workbook: validateDevWorkbook(command.workbook) };
  if (command.payload.tempPath) command = { ...command, payload: { ...command.payload, tempPath: validateTempImage(command.payload.tempPath) } };
  if (command.type === "APPLY_CHANGE" && (!command.payload.mappingConfirmed || command.simulation)) throw Object.assign(new Error("Escrita exige homologação ativa, prévia aprovada e mapeamento confirmado."), { code: "WRITE_NOT_AUTHORIZED" });
  if (command.type === "APPLY_CHANGE") validateOperationalRules(command);
  if (process.platform !== "win32") throw Object.assign(new Error("Automação COM disponível somente no Windows."), { code: "WINDOWS_REQUIRED" });
  return command;
}

function validateOperationalRules(command: ExcelAgentCommand) {
  const proposed = command.payload.proposed ?? {};
  const status = String(proposed.status ?? "").trim().toUpperCase();
  if (status === "R") {
    const requiredCells = ["descriptionCell", "startDateCell", "startTimeCell", "forecastDateCell", "forecastTimeCell"] as const;
    if (requiredCells.some(field => !command.payload[field])) throw ruleError("Status R exige descrição e células de início/previsão mapeadas.");
    if (String(proposed.description ?? "").trim().toUpperCase() !== "RODANDO") throw ruleError("Status R exige descrição RODANDO.");
    for (const field of ["startDate", "startTime", "forecastDate", "forecastTime"]) if (String(proposed[field] ?? "").trim() !== "") throw ruleError("Status R exige " + field + " vazio.");
  }
  const hasForecast = String(proposed.forecastDate ?? "").trim() !== "" || String(proposed.forecastTime ?? "").trim() !== "";
  if (hasForecast) {
    if (!command.payload.startDateCell || !command.payload.startTimeCell) throw ruleError("Previsão exige células de início mapeadas.");
    if (proposed.startDate == null || proposed.startTime == null) throw ruleError("Previsão exige data e hora de início da ocorrência.");
  }
}

function ruleError(message: string) { return Object.assign(new Error(message), { code: "OPERATIONAL_RULE_VIOLATION" }); }

function invoke(command: ExcelAgentCommand, timeout: number) {
  return new Promise<unknown>((resolve, reject) => {
    const encoded = Buffer.from(JSON.stringify(command)).toString("base64");
    const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", script, "-InputBase64", encoded], { windowsHide: true });
    let stdout = "", stderr = "";
    const timer = setTimeout(() => { child.kill(); reject(Object.assign(new Error("Comando Excel excedeu o tempo limite."), { code: "COMMAND_TIMEOUT" })); }, timeout);
    child.stdout.on("data", data => stdout += data);
    child.stderr.on("data", data => stderr += data);
    child.on("error", reject);
    child.on("close", code => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(stderr.trim() || "PowerShell finalizou com código " + code + "."));
      try { resolve(JSON.parse(stdout.trim())); } catch { reject(new Error("Resposta COM inválida: " + stdout)); }
    });
  });
}

function envelope(command: ExcelAgentCommand, started: number, value: { success: boolean; executed: boolean; result?: unknown; error?: ExcelCommandResult["error"] }): ExcelCommandResult {
  return { commandId: command.commandId, correlationId: command.correlationId, type: command.type, success: value.success, result: value.result, error: value.error, duration: Date.now() - started, completedAt: new Date().toISOString(), simulation: command.simulation, executed: value.executed, macrosExecuted: false, officialWorkbookTouched: false };
}

function classify(message: string) {
  if (message.includes("CELL_CONFLICT")) return "CELL_CONFLICT";
  if (message.includes("AMBIGUOUS")) return "AMBIGUOUS_MATCH";
  if (message.includes("FORMULA_PROTECTED")) return "FORMULA_PROTECTED";
  return "EXCEL_COMMAND_FAILED";
}
