import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ExcelAgentCommand, ExcelAgentStatus } from "@coa-bot/excel-contracts";

const simulationMode = process.env.SIMULATION_MODE !== "false";
const apiUrl = process.env.API_URL ?? "http://localhost:3333";
const agentId = process.env.EXCEL_AGENT_ID ?? "local-excel-agent";
const version = process.env.EXCEL_AGENT_VERSION ?? "0.1.0";
const configuredFiles = [
  "planilhas/Planilha Plantio cana.xlsm",
  "planilhas/Acompanhamento Tratos Culturais.xlsm"
].map((filePath) => ({
  path: path.resolve(filePath),
  exists: fs.existsSync(filePath)
}));

export function detectExcelInstalled(): boolean | "unknown" {
  if (os.platform() !== "win32") return "unknown";
  return fs.existsSync("C:/Program Files/Microsoft Office") || fs.existsSync("C:/Program Files (x86)/Microsoft Office");
}

export function getStatus(): ExcelAgentStatus {
  return {
    agentId,
    online: true,
    operatingSystem: `${os.platform()} ${os.release()}`,
    version,
    simulationMode,
    excelInstalled: detectExcelInstalled(),
    configuredFiles
  };
}

export async function handleCommand(command: ExcelAgentCommand) {
  return {
    command,
    simulated: true,
    executed: false,
    reason: "Agente Excel esta em modo de simulacao. Nenhum arquivo real foi alterado."
  };
}

async function register() {
  const status = getStatus();
  try {
    await fetch(`${apiUrl}/excel-agent/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(status)
    });
    console.log("Agente Excel registrado na API em modo simulacao.", status);
  } catch (error) {
    console.log("API indisponivel; agente Excel permanece em modo local.", status, error);
  }
}

if (process.argv[1]?.endsWith("index.ts")) {
  register();
}
