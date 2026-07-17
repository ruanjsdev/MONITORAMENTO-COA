import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ExcelAgentCommand, ExcelAgentStatus } from "@coa-bot/excel-contracts";
import { executeComCommand } from "./com-bridge.js";
import { homologationRoot, validateDevWorkbook } from "./security.js";

const apiUrl = process.env.API_URL ?? "http://localhost:3333";
const agentId = process.env.EXCEL_AGENT_ID ?? "local-excel-agent";
const version = process.env.EXCEL_AGENT_VERSION ?? "0.3.0";
const whatsappSimulation = process.env.SIMULATION_MODE !== "false";
const files = ["Planilha Plantio cana.dev.xlsm", "Acompanhamento Tratos Culturais.dev.xlsm"].map(name => path.join(homologationRoot, name));

export function detectExcelInstalled(): boolean | "unknown" { if (os.platform() !== "win32") return "unknown"; try { return Boolean(requireProgId()); } catch { return false; } }
function requireProgId() { return fs.existsSync("C:/Program Files/Microsoft Office") || fs.existsSync("C:/Program Files (x86)/Microsoft Office"); }
export function getStatus(): ExcelAgentStatus { return { agentId, online: true, operatingSystem: `${os.platform()} ${os.release()}`, version, simulationMode: whatsappSimulation, homologationMode: true, excelInstalled: detectExcelInstalled(), configuredFiles: files.map(file => ({ path: file, exists: fs.existsSync(file), authorized: safe(file) })), lastHeartbeat: new Date().toISOString() }; }
function safe(file: string) { try { validateDevWorkbook(file); return true; } catch { return false; } }
export async function handleCommand(input: ExcelAgentCommand | Record<string, unknown>) {
  if (!("commandId" in input)) return { command: input, simulated: true, executed: false, reason: "Contrato legado bloqueado" };
  const command = input as ExcelAgentCommand;
  if (command.type === "OPEN_LOCAL_FOLDER") {
    if (process.platform !== "win32") return { commandId:command.commandId, correlationId:command.correlationId, type:command.type, success:false, error:{code:"WINDOWS_REQUIRED",message:"Abertura requer Windows"}, duration:0, completedAt:new Date().toISOString(), simulation:false, executed:false, macrosExecuted:false, officialWorkbookTouched:false } as any;
    const target = homologationRoot;
    const { spawn } = await import("node:child_process"); spawn("explorer.exe", [target], { detached:true, stdio:"ignore" }).unref();
    return { commandId:command.commandId, correlationId:command.correlationId, type:command.type, success:true, result:{ opened:true, path:target }, duration:0, completedAt:new Date().toISOString(), simulation:false, executed:true, macrosExecuted:false, officialWorkbookTouched:false } as any;
  }
  return executeComCommand(command);
}
export function command(type: ExcelAgentCommand["type"], input: Partial<ExcelAgentCommand> = {}): ExcelAgentCommand { return { commandId: randomUUID(), correlationId: randomUUID(), requestedAt: new Date().toISOString(), requestedBy: "local-operator", type, payload: {}, simulation: true, ...input }; }

async function registerForever() {
  let delay = 1000;
  const agentToken = process.env.EXCEL_AGENT_TOKEN;
  if (!agentToken || agentToken.length < 32) throw new Error("EXCEL_AGENT_TOKEN forte (mínimo 32 caracteres) é obrigatório.");
  const headers = { "Content-Type": "application/json", "x-excel-agent-token": agentToken };
  for (;;) {
    try {
      await fetch(`${apiUrl}/excel-agent/local/heartbeat`, { method: "POST", headers, body: JSON.stringify(getStatus()) });
      const next = await fetch(`${apiUrl}/excel-agent/local/commands/next`, { headers });
      if (next.ok && next.status !== 204) {
        const queued = await next.json() as ExcelAgentCommand;
        const result = await handleCommand(queued);
        await postResultUntilAccepted(queued.commandId, result, headers);
      }
      delay = 1000;
    } catch (error) {
      console.log(`API indisponível; nova tentativa em ${delay}ms.`, error);
      delay = Math.min(delay * 2, 30_000);
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

async function postResultUntilAccepted(commandId: string, result: unknown, headers: Record<string, string>) {
  let delay = 500;
  for (;;) {
    try {
      const response = await fetch(`${apiUrl}/excel-agent/local/commands/${commandId}/result`, { method: "POST", headers, body: JSON.stringify(result) });
      if (response.ok) return;
      if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) throw new Error(`Resultado rejeitado permanentemente: HTTP ${response.status} ${await response.text()}`);
    } catch (error) {
      if (String(error).includes("permanentemente")) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, delay));
    delay = Math.min(delay * 2, 30_000);
  }
}

if (process.argv[1]?.endsWith("index.ts")) registerForever();
