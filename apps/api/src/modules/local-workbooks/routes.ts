import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { Prisma, PrismaClient } from "@prisma/client";
import { Router } from "express";
import {
  ExcelAgentCommand,
  LOCAL_OPERATIONAL_WORKBOOKS,
  localWorkbookByOperation,
  maskLocalWorkbookPath,
  validateLocalOperationalWorkbook
} from "@coa-bot/excel-contracts";
import { enqueueExcelCommand, waitForExcelResult } from "../excel-homologation/routes.js";
import { HttpError } from "../../errors/http-error.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
const configuredRoot = process.env.LOCAL_OPERATIONAL_WORKBOOK_ROOT?.trim() || "planilhas-homologacao";
const root = path.resolve(path.isAbsolute(configuredRoot) ? configuredRoot : path.join(projectRoot, configuredRoot));
const officialRoot = path.resolve(projectRoot, "planilhas");
const backupRoot = path.resolve(projectRoot, "backups-excel-local");
const tempRoot = path.resolve(projectRoot, "temp");
const confirmationPhrase = "CONFIRMO ALTERAÇÃO NA PLANILHA LOCAL";
const editableFields = ["status", "startDate", "startTime", "forecastDate", "forecastTime", "description"];

export function localWorkbookRoutes(prisma = new PrismaClient()) {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({ mode: "LOCAL_OPERATIONAL", officialExcelWrite: false, localOperationalExcelWrite: process.env.LOCAL_OPERATIONAL_EXCEL_WRITE === "true", workbooks: listWorkbooks() });
  });

  router.get("/status", (_req, res) => {
    res.json({ mode: "LOCAL_OPERATIONAL", root: root.replace(process.cwd(), "<project>"), workbooks: listWorkbooks(), officialExcelWrite: false });
  });

  router.post("/:id/open", async (req, res, next) => {
    try { res.json(await command("OPEN_LOCAL_WORKBOOK", workbookById(req.params.id))); }
    catch (error) { next(error); }
  });

  router.post("/open-all", async (_req, res, next) => {
    try {
      const results = [];
      for (const workbook of LOCAL_OPERATIONAL_WORKBOOKS) results.push(await command("OPEN_LOCAL_WORKBOOK", workbookById(workbook.id)));
      res.json({ results });
    } catch (error) { next(error); }
  });

  router.post("/open-folder", async (_req, res, next) => {
    try { res.json(await command("OPEN_LOCAL_FOLDER")); }
    catch (error) { next(error); }
  });

  router.post("/preview/:pendingId", async (req, res, next) => {
    try { res.json(await buildLocalPreview(prisma, String(req.params.pendingId))); }
    catch (error) { next(error); }
  });

  router.post("/apply/:pendingId", async (req, res, next) => {
    try {
      const setting = await prisma.generalSetting.findUnique({ where: { key: "OPERATIONAL_MODE" } });
      if (setting?.value !== "LOCAL_OPERATIONAL") throw new HttpError(409, "Ative LOCAL_OPERATIONAL antes da escrita local.", { code: "LOCAL_OPERATIONAL_MODE_REQUIRED" });
      if (process.env.OFFICIAL_EXCEL_WRITE === "true") throw new HttpError(409, "OFFICIAL_EXCEL_WRITE precisa permanecer false.", { code: "OFFICIAL_EXCEL_WRITE_MUST_STAY_FALSE" });
      if (process.env.LOCAL_OPERATIONAL_EXCEL_WRITE !== "true") throw new HttpError(409, "LOCAL_OPERATIONAL_EXCEL_WRITE=true é obrigatório.", { code: "LOCAL_WRITE_DISABLED" });

      const preview = await buildLocalPreview(prisma, String(req.params.pendingId));
      const backup = createLocalBackup(preview.workbook.absolutePath, preview.pendingId, preview.fleet, res.locals.user?.name ?? "Operador");
      const excelCommand: ExcelAgentCommand = {
        commandId: randomUUID(),
        correlationId: randomUUID(),
        requestedAt: new Date().toISOString(),
        requestedBy: res.locals.user?.name ?? "Operador",
        type: "APPLY_CHANGE",
        workbook: preview.workbook.absolutePath,
        worksheet: preview.worksheet,
        payload: {
          ...preview.cells,
          row: preview.row,
          fleet: preview.fleet,
          implement: preview.implement ?? undefined,
          expectedCurrent: preview.currentNormalized,
          proposed: preview.proposed,
          editableFields,
          mappingConfirmed: true,
          backupPath: backup.path,
          backupHash: backup.hash,
          confirmation: confirmationPhrase
        },
        simulation: false,
        timeoutMs: 90_000
      };
      enqueueExcelCommand(excelCommand);
      const result = await waitForExcelResult(excelCommand.commandId, 95_000);
      if (!result.success) throw new HttpError(409, "Escrita local bloqueada pelo Excel Agent.", { code: result.error?.code, message: result.error?.message, backup });
      await prisma.systemLog.create({ data: { userId: res.locals.user?.id, action: "LOCAL_OPERATIONAL_EXCEL_WRITE", entity: "PendingChange", entityId: preview.pendingId, message: "Alteração local .dev confirmada, escrita e relida pelo Excel Agent.", metadata: { backup, result: result.result ?? null, officialExcelWrite: false, sendMessage: false, sendReaction: false } as Prisma.InputJsonObject } });
      res.json({ ...preview, confirmed: true, backup, result, officialExcelWrite: false, sendMessage: false, sendReaction: false });
    } catch (error) { next(error); }
  });

  router.post("/image/:pendingId", async (req, res, next) => {
    try {
      const preview = await buildLocalPreview(prisma, String(req.params.pendingId));
      const operation = await prisma.operation.findUnique({ where: { name: preview.operation } });
      // Plantio report is intentionally cropped to the visible operational
      // table; do not include the unused columns/rows from the workbook.
      const range = preview.operation === "Plantio Mecanizado"
        ? "B2:S20"
        : (operation?.imageRange || "A1:AI26");
      const outputDir = path.join(tempRoot, new Date().toISOString().slice(0, 10));
      fs.mkdirSync(outputDir, { recursive: true });
      const tempPath = path.join(outputDir, `${preview.fleet.replace(/[^a-z0-9-]/gi, "_")}-${Date.now()}.png`);
      const excelCommand: ExcelAgentCommand = {
        commandId: randomUUID(),
        correlationId: randomUUID(),
        requestedAt: new Date().toISOString(),
        requestedBy: res.locals.user?.name ?? "Operador",
        type: "COPY_RANGE_AS_PICTURE",
        workbook: preview.workbook.absolutePath,
        worksheet: preview.worksheet,
        payload: { range, tempPath },
        simulation: false,
        timeoutMs: 60_000
      };
      enqueueExcelCommand(excelCommand);
      const result = await waitForExcelResult(excelCommand.commandId, 65_000);
      if (!result.success) throw new HttpError(409, "CopyPicture local falhou.", { code: result.error?.code, message: result.error?.message });
      res.json({ image: { path: tempPath.replace(projectRoot, "<project>"), range }, result, sendMessage: false, sendReaction: false });
    } catch (error) { next(error); }
  });

  return router;
}

function listWorkbooks() {
  return LOCAL_OPERATIONAL_WORKBOOKS.map(definition => {
    const validation = validateLocalOperationalWorkbook({ id: definition.id, root, officialRoot, mustExist: false });
    return { ...validation, name: validation.fileName, path: maskLocalWorkbookPath(validation.filePath, root), absolutePath: undefined, writable: process.env.LOCAL_OPERATIONAL_EXCEL_WRITE === "true", status: "CLOSED", officialExcelWrite: false };
  });
}

function workbookById(id: string) {
  const validation = validateLocalOperationalWorkbook({ id, root, officialRoot, mustExist: true });
  return { ...validation, absolutePath: validation.filePath };
}

async function command(type: ExcelAgentCommand["type"], workbook?: { absolutePath?: string }, options: { worksheet?: string; payload?: Record<string, unknown> } = {}) {
  const excelCommand: ExcelAgentCommand = {
    commandId: randomUUID(),
    correlationId: randomUUID(),
    requestedAt: new Date().toISOString(),
    requestedBy: "local-operator",
    type,
    workbook: workbook?.absolutePath,
    worksheet: options.worksheet,
    payload: options.payload ?? {},
    simulation: type === "PREVIEW_CHANGE",
    timeoutMs: 30_000
  };
  enqueueExcelCommand(excelCommand);
  return waitForExcelResult(excelCommand.commandId, 35_000);
}

async function buildLocalPreview(prisma: PrismaClient, pendingId: string) {
  const pending = await prisma.pendingChange.findUnique({ where: { id: pendingId }, include: { operation: true, incomingMessage: { include: { parsedMessages: true } } } });
  if (!pending) throw new HttpError(404, "Pendência não encontrada.");
  const definition = localWorkbookByOperation(pending.operation?.name);
  const workbook = workbookById(definition.id);
  const worksheet = pending.operation?.sheetName || (pending.operation?.name === "Plantio Mecanizado" ? "PLANTIO" : "CPD");
  const findResult = await command("FIND_EQUIPMENT", workbook, { worksheet, payload: { fleetColumn: pending.operation?.fleetColumn || "F", fleet: pending.equipmentCode, headerRow: 7 } });
  const match = (findResult.result as { candidates?: Array<{ row: number }>; status?: string } | undefined)?.candidates?.[0];
  if (!findResult.success || (findResult.result as { status?: string } | undefined)?.status !== "UNIQUE_MATCH" || !match) throw new HttpError(409, "Frota não localizada de forma única na planilha .dev.", { code: "AMBIGUOUS_MATCH" });
  const row = Number(match.row);
  const parsed = pending.incomingMessage?.parsedMessages?.map(item => item.parsedJson as Record<string, unknown>).find(item => String(item.mainEquipment) === pending.equipmentCode) ?? {};
  const normalized = (parsed.normalized ?? {}) as Record<string, unknown>;
  const proposed = buildProposed(pending.newStatus, pending.description, normalized);
  const cells = { statusCell: `H${row}`, startDateCell: `K${row}`, startTimeCell: `L${row}`, forecastDateCell: `M${row}`, forecastTimeCell: `N${row}`, descriptionCell: `S${row}` };
  const preview = await command("PREVIEW_CHANGE", workbook, { worksheet, payload: { ...cells, proposed, mappingConfirmed: false } });
  if (!preview.success) throw new HttpError(409, "Leitura da prévia local falhou.", { code: preview.error?.code });
  const current = (preview.result as { current?: Record<string, { value?: unknown }> } | undefined)?.current ?? {};
  return {
    mode: "LOCAL_OPERATIONAL",
    officialExcelWrite: false,
    confirmed: false,
    confirmationRequired: confirmationPhrase,
    pendingId: pending.id,
    operation: pending.operation?.name ?? "",
    workbook: { id: workbook.id, name: workbook.fileName, path: maskLocalWorkbookPath(workbook.filePath, root), absolutePath: workbook.filePath },
    worksheet,
    fleet: pending.equipmentCode,
    implement: Array.isArray(parsed.attachments) ? String(parsed.attachments[0] ?? "") : null,
    row,
    cells,
    current,
    currentNormalized: normalizeCurrent(current),
    proposed,
    backup: plannedBackup(workbook.filePath),
    hash: hashFileIfExists(workbook.filePath),
    macrosBlocked: true,
    message: "Prévia local pronta; nenhuma célula foi escrita."
  };
}

function buildProposed(status: string, description: string, normalized: Record<string, unknown>) {
  const proposed = { status, startDate: normalized.startDate ?? "", startTime: normalized.startTime ?? "", forecastDate: normalized.forecastDate ?? "", forecastTime: normalized.forecastTime ?? "", description };
  if (String(proposed.status).toUpperCase() === "R") {
    proposed.description = "RODANDO";
    proposed.startDate = "";
    proposed.startTime = "";
    proposed.forecastDate = "";
    proposed.forecastTime = "";
  }
  return proposed;
}

function normalizeCurrent(current: Record<string, { value?: unknown }>) {
  return { status: current.statusCell?.value ?? "", startDate: current.startDateCell?.value ?? "", startTime: current.startTimeCell?.value ?? "", forecastDate: current.forecastDateCell?.value ?? "", forecastTime: current.forecastTimeCell?.value ?? "", description: current.descriptionCell?.value ?? "" };
}

function plannedBackup(filePath: string) {
  const date = new Date();
  const folder = path.join(backupRoot, date.toISOString().slice(0, 10));
  const stamp = date.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const name = `${path.basename(filePath, ".xlsm")}-${stamp}.xlsm`;
  return { path: path.join(folder, name).replace(projectRoot, "<project>"), folder: folder.replace(projectRoot, "<project>") };
}

function createLocalBackup(filePath: string, pendingId: string, fleet: string, operator: string) {
  const planned = plannedBackup(filePath);
  const backupPath = planned.path.replace("<project>", projectRoot);
  if (fs.existsSync(backupPath)) throw new HttpError(409, "Backup local já existe; nova tentativa necessária.", { code: "LOCAL_BACKUP_ALREADY_EXISTS" });
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(filePath, backupPath, fs.constants.COPYFILE_EXCL);
  const hash = hashFileIfExists(backupPath);
  if (!hash) throw new HttpError(409, "Backup local não pôde ser validado por hash.", { code: "LOCAL_BACKUP_HASH_FAILED" });
  const sizeBytes = fs.statSync(backupPath).size;
  return { path: backupPath.replace(projectRoot, "<project>"), hash, sizeBytes, createdAt: new Date().toISOString(), pendingId, fleet, operator };
}

function hashFileIfExists(filePath: string) {
  if (!fs.existsSync(filePath)) return null;
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}
