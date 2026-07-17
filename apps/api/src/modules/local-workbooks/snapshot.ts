import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { ExcelAgentCommand, localWorkbookByOperation, validateLocalOperationalWorkbook } from "@coa-bot/excel-contracts";
import { enqueueExcelCommand, waitForExcelResult } from "../excel-homologation/routes.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
const workbookRoot = path.resolve(projectRoot, process.env.LOCAL_OPERATIONAL_WORKBOOK_ROOT?.trim() || "planilhas-homologacao");
const officialRoot = path.resolve(projectRoot, "planilhas");

export type RealFleetState = {
  fleet: string;
  status: string;
  description: string;
  operation: string;
  sector: string;
  updatedAt: string;
  stoppedMinutes: number;
  stopMetrics: { todayMinutes: number; shiftMinutes: number; weekMinutes: number; stopCount: number; longestMinutes: number; lastStopAt?: string; runningSince?: string };
};

type RealSnapshot = { fleets: RealFleetState[]; readAt: string; source: "EXCEL_COM_LOCAL_DEV"; unavailableSheets: string[] };
let cachedSnapshot: RealSnapshot | undefined;
let refreshPromise: Promise<RealSnapshot> | undefined;
const snapshotTtlMs = 30_000;

export function invalidateRealLocalFleetSnapshot() { cachedSnapshot = undefined; }

export async function readRealLocalFleetSnapshot(prisma: PrismaClient) {
  if (cachedSnapshot && Date.now() - new Date(cachedSnapshot.readAt).getTime() < snapshotTtlMs) return cachedSnapshot;
  if (cachedSnapshot) {
    void refreshSnapshot(prisma).catch(() => undefined);
    return cachedSnapshot;
  }
  return refreshSnapshot(prisma);
}

function refreshSnapshot(prisma: PrismaClient) {
  if (!refreshPromise) refreshPromise = loadSnapshot(prisma).then(result => (cachedSnapshot = result)).finally(() => { refreshPromise = undefined; });
  return refreshPromise;
}

async function loadSnapshot(prisma: PrismaClient): Promise<RealSnapshot> {
  const operations = await prisma.operation.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  const fleets: RealFleetState[] = [];
  const unavailableSheets: string[] = [];
  const readAt = new Date().toISOString();

  for (const operation of operations) {
    if (!operation.sheetName) continue;
    const definition = localWorkbookByOperation(operation.name);
    const workbook = validateLocalOperationalWorkbook({ id: definition.id, root: workbookRoot, officialRoot, mustExist: true });
    const worksheet = resolveSheetName(operation.name, operation.sheetName);
    const command: ExcelAgentCommand = {
      commandId: randomUUID(), correlationId: randomUUID(), requestedAt: readAt,
      requestedBy: "operational-snapshot", type: "READ_RANGE", workbook: workbook.filePath,
      worksheet, payload: { range: "A1:S250" }, simulation: false, timeoutMs: 45_000
    };
    enqueueExcelCommand(command);
    const response = await waitForExcelResult(command.commandId, 50_000);
    if (!response.success) { unavailableSheets.push(`${operation.name}: ${worksheet}`); continue; }
    const values = normalizeMatrix((response.result as { values?: unknown })?.values);
    for (const row of values) {
      const fleet = text(row[5]);
      const rawStatus = text(row[7]).toUpperCase();
      if (!/^\d{2,6}$/.test(fleet) || !rawStatus) continue;
      const startDate = excelValue(row[10]);
      const startTime = excelValue(row[11]);
      const startedAt = combineExcelDateTime(startDate, startTime);
      const running = rawStatus === "R";
      const stoppedMinutes = !running && startedAt ? Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 60_000)) : 0;
      fleets.push({
        fleet,
        status: running ? "RODANDO" : rawStatus === "P" ? "PARADO" : rawStatus,
        description: text(row[18]) || (running ? "RODANDO" : "SEM DESCRIÇÃO"),
        operation: operation.name,
        sector: text(row[3]) || "NÃO INFORMADO",
        updatedAt: readAt,
        stoppedMinutes,
        stopMetrics: { todayMinutes: stoppedMinutes, shiftMinutes: stoppedMinutes, weekMinutes: stoppedMinutes, stopCount: startedAt ? 1 : 0, longestMinutes: stoppedMinutes, lastStopAt: startedAt?.toISOString(), runningSince: startedAt?.toISOString() }
      });
    }
  }
  return { fleets, readAt, source: "EXCEL_COM_LOCAL_DEV", unavailableSheets };
}

function resolveSheetName(operation: string, configured: string) {
  if (operation === "Compostagem") return "COMPOSTAGEM ";
  if (operation === "Correção de Solo") return "CORREÇÃO DE SOLO";
  return configured;
}

function normalizeMatrix(value: unknown): unknown[][] {
  if (!Array.isArray(value)) return [];
  if (value.some(Array.isArray)) return value.map(row => Array.isArray(row) ? row : [row]);
  const rows: unknown[][] = [];
  for (let index = 0; index < value.length; index += 19) rows.push(value.slice(index, index + 19));
  return rows;
}
function text(value: unknown) { return value == null ? "" : String(value).trim(); }
function excelValue(value: unknown) { return typeof value === "number" ? value : text(value); }
function combineExcelDateTime(date: unknown, time: unknown) {
  if (typeof date === "number") {
    const days = date + (typeof time === "number" ? time : 0);
    return new Date(Date.UTC(1899, 11, 30) + days * 86_400_000);
  }
  const dateText = text(date);
  if (!dateText) return undefined;
  const match = dateText.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return undefined;
  const [hours, minutes] = text(time).split(":").map(Number);
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), hours || 0, minutes || 0);
}
