import { Prisma, PrismaClient } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import {
  ExcelAgentCommand,
  OFFICIAL_PILOT_ACTIVATION,
  OFFICIAL_PILOT_FIELDS,
  OFFICIAL_PILOT_POLICY,
  OFFICIAL_PILOT_ROLLBACK_CONFIRMATION,
  OFFICIAL_PILOT_WRITE_CONFIRMATION,
  officialPilotAddresses
} from "@coa-bot/excel-contracts";
import { asyncHandler } from "../../middleware/async-handler.js";
import { HttpError } from "../../errors/http-error.js";
import {
  enqueueOfficialExcelCommand,
  finalizeUndispatchedOfficialJob,
  registerOfficialExcelResultHandler,
  waitForOfficialExcelResult
} from "../excel-homologation/routes.js";
import {
  configuredPilotGroupJid,
  firstPilotProposalBlockers,
  maskPilotJid,
  pilotProposedValues,
  pilotRuntimeBlockers,
  pilotScopeBlockers
} from "./policy.js";
import {
  reconcileCompletedOfficialPilotJobs,
  reconcileOfficialPilotCommand
} from "./reconciliation.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "../../../../..");
const backupRoot = path.join(projectRoot, "backups-excel");
const activeStatuses = ["PREPARING", "PREVIEW_READY", "APPROVAL_RECORDED", "BASELINE_VALIDATED", "BACKUP_CREATED", "WRITING", "SAVED", "ROLLBACK_PENDING"] as const;

export function officialPilotRoutes(prisma = new PrismaClient()) {
  const router = Router();
  registerOfficialExcelResultHandler(commandId => reconcileOfficialPilotCommand(prisma, commandId));

  router.use((_req, res, next) => {
    if (!res.locals.user?.roles.includes("ADMIN")) return res.status(403).json({ error: "Permissão ADMIN obrigatória para o piloto oficial." });
    if (process.env.OFFICIAL_EXCEL_WRITE !== "true" && _req.path !== "/status") return res.status(410).json({ error: "Planilha oficial permanentemente desabilitada; use LOCAL_OPERATIONAL com arquivos .dev.", code: "OFFICIAL_EXCEL_WRITE_DISABLED" });
    next();
  });

  router.get("/status", asyncHandler(async (_req, res) => {
    await reconcileCompletedOfficialPilotJobs(prisma);
    const [mode, latest] = await Promise.all([
      prisma.generalSetting.findUnique({ where: { key: "OPERATIONAL_MODE" } }),
      prisma.officialPilotWrite.findFirst({ orderBy: { createdAt: "desc" }, include: { events: { orderBy: { createdAt: "asc" } } } })
    ]);
    const runtimeBlockers = pilotRuntimeBlockers(res.locals.user);
    res.json({
      mode: mode?.value ?? "SHADOW",
      activationRequired: OFFICIAL_PILOT_ACTIVATION,
      writeConfirmationRequired: OFFICIAL_PILOT_WRITE_CONFIRMATION,
      rollbackConfirmationRequired: OFFICIAL_PILOT_ROLLBACK_CONFIRMATION,
      whitelist: publicPolicy(), latest: latest ? mapWrite(latest) : null,
      runtimeBlockers,
      sendMessage: false, sendReaction: false,
      officialExcelWrite: mode?.value === "LIVE_APPROVAL_PILOT" && runtimeBlockers.length === 0
    });
  }));

  router.get("/writes/:id", asyncHandler(async (req, res) => {
    await reconcileCompletedOfficialPilotJobs(prisma);
    const write = await loadWrite(prisma, String(req.params.id));
    res.json(mapWrite(write));
  }));

  router.post("/pending/:id/prepare", asyncHandler(async (req, res) => {
    const user = res.locals.user!;
    const pending = await loadPending(prisma, String(req.params.id));
    const context = pendingContext(pending);
    const workbook = configuredWorkbook();
    const blockers = proposalBlockers(pending, context, workbook);
    if (blockers.length) throw new HttpError(403, "Pendência fora da lista branca do piloto oficial.", { code: blockers[0], blockers });
    const contextHash = pendingFingerprint(pending, context);
    const existing = await prisma.officialPilotWrite.findUnique({ where: { pendingChangeId: pending.id }, include: { events: { orderBy: { createdAt: "asc" } } } });
    if (existing?.status === "VERIFIED" || (existing?.status === "PREVIEW_READY" && existing.contextHash === contextHash && existing.pendingVersion === pending.version)) {
      res.json(mapWrite(existing));
      return;
    }
    if (existing?.status === "PREPARING") {
      await reconcileOfficialPilotCommand(prisma, existing.prepareCommandId);
      const current = await loadWrite(prisma, existing.id);
      res.status(current.status === "PREPARING" ? 202 : 200).json(mapWrite(current));
      return;
    }

    const prepareCommandId = randomUUID();
    const correlationId = existing?.correlationId ?? context.correlationId ?? randomUUID();
    const backupPath = createBackupPath();
    const proposed = pilotProposedValues(context.normalized);
    const command: ExcelAgentCommand = {
      commandId: prepareCommandId, correlationId, requestedAt: new Date().toISOString(), requestedBy: user.name,
      type: "PREPARE_OFFICIAL_PILOT", workbook, worksheet: OFFICIAL_PILOT_POLICY.worksheet,
      payload: { fleet: context.fleet, implement: context.implement, backupPath }, simulation: false, timeoutMs: 90_000
    };

    const record = await prisma.$transaction(async tx => {
      await acquirePilotLock(tx);
      const fresh = await loadPending(tx, pending.id);
      const freshContext = pendingContext(fresh);
      if (fresh.version !== pending.version || pendingFingerprint(fresh, freshContext) !== contextHash) throw new HttpError(409, "A pendência mudou durante a preparação.", { code: "PILOT_CONTEXT_CONFLICT" });
      const freshBlockers = proposalBlockers(fresh, freshContext, workbook);
      if (freshBlockers.length) throw new HttpError(403, "Pendência fora da lista branca do piloto oficial.", { code: freshBlockers[0], blockers: freshBlockers });
      const concurrent = await tx.officialPilotWrite.findFirst({ where: { pendingChangeId: { not: pending.id }, status: { in: [...activeStatuses] } } });
      if (concurrent) throw new HttpError(409, "Já existe uma escrita oficial em preparação ou andamento.", { code: "PILOT_WRITE_IN_PROGRESS", writeId: concurrent.id });
      await assertNoOfficialJobRunning(tx);
      const saved = existing
        ? await tx.officialPilotWrite.update({ where: { id: existing.id }, data: {
            status: "PREPARING", confirmed: false, prepareCommandId, commandId: null, rollbackCommandId: null,
            userId: user.id, userName: user.name, groupName: freshContext.groupName, groupJid: freshContext.groupJid,
            messageId: fresh.incomingMessageId ?? fresh.id, originalMessage: fresh.incomingMessage?.content ?? fresh.description,
            operation: freshContext.operation, fleet: freshContext.fleet, implement: freshContext.implement,
            workbook, worksheet: OFFICIAL_PILOT_POLICY.worksheet, backupPath, cells: {} as never,
            baselineValues: Prisma.DbNull, rereadValues: Prisma.DbNull, originalHash: null, backupHash: null, writtenHash: null,
            sizeBytes: null, pendingVersion: fresh.version, contextHash, result: null, errorCode: null, errorMessage: null,
            proposedValues: proposed as never, startedAt: new Date(), completedAt: null, durationMs: null
          } })
        : await tx.officialPilotWrite.create({ data: {
            pendingChangeId: fresh.id, status: "PREPARING", confirmed: false, prepareCommandId, correlationId,
            userId: user.id, userName: user.name, groupName: freshContext.groupName, groupJid: freshContext.groupJid,
            messageId: fresh.incomingMessageId ?? fresh.id, originalMessage: fresh.incomingMessage?.content ?? fresh.description,
            operation: freshContext.operation, fleet: freshContext.fleet, implement: freshContext.implement,
            workbook, worksheet: OFFICIAL_PILOT_POLICY.worksheet, cells: {} as never, proposedValues: proposed as never,
            backupPath, pendingVersion: fresh.version, contextHash
          } });
      await tx.officialPilotWriteEvent.create({ data: { writeId: saved.id, step: "prepare", label: "Preparação iniciada", status: "RUNNING", userId: user.id, detail: "Somente leitura, backup e hash; nenhuma escrita autorizada." } });
      await enqueueOfficialExcelCommand(command, tx);
      return saved;
    });

    const completed = await waitAndReconcile(prisma, command);
    const updated = await loadWrite(prisma, record.id);
    if (!completed) { res.status(202).json(mapWrite(updated)); return; }
    if (updated.status !== "PREVIEW_READY") {
      const code = updated.errorCode ?? "PILOT_PREPARE_FAILED";
      throw new HttpError(code === "FILE_LOCKED" ? 423 : 409, "Preparação segura bloqueada pelo Excel Agent.", { code, message: updated.errorMessage, write: mapWrite(updated) });
    }
    res.json(mapWrite(updated));
  }));

  router.post("/writes/:id/confirm", asyncHandler(async (req, res) => {
    if (req.body.confirmation !== OFFICIAL_PILOT_WRITE_CONFIRMATION) throw new HttpError(409, `Confirmação exigida: ${OFFICIAL_PILOT_WRITE_CONFIRMATION}`, { code: "PILOT_CONFIRMATION_REQUIRED" });
    const user = res.locals.user!;
    const runtimeBlockers = pilotRuntimeBlockers(user);
    if (runtimeBlockers.length) throw new HttpError(409, "Ambiente ou conta administrativa ainda não está seguro para escrita oficial.", { code: runtimeBlockers[0], blockers: runtimeBlockers });
    const initial = await loadWrite(prisma, String(req.params.id));
    if (initial.status === "VERIFIED") { res.json(mapWrite(initial)); return; }
    if (initial.status === "WRITING" && initial.commandId) {
      await reconcileOfficialPilotCommand(prisma, initial.commandId);
      const current = await loadWrite(prisma, initial.id);
      res.status(current.status === "WRITING" ? 202 : writeHttpStatus(current)).json(mapWrite(current));
      return;
    }
    if (initial.status !== "PREVIEW_READY" || !initial.row || !initial.baselineValues || !initial.backupHash || !initial.originalHash) throw new HttpError(409, "Prévia válida, baseline e backup confirmado são obrigatórios.", { code: "PILOT_PREVIEW_REQUIRED" });

    const commandId = randomUUID();
    const addresses = officialPilotAddresses(initial.row);
    const command: ExcelAgentCommand = {
      commandId, correlationId: initial.correlationId, requestedAt: new Date().toISOString(), requestedBy: user.name,
      type: "APPLY_OFFICIAL_PILOT", workbook: initial.workbook, worksheet: initial.worksheet,
      payload: {
        fleet: initial.fleet, implement: initial.implement, row: initial.row,
        statusCell: addresses.status, startDateCell: addresses.startDate, startTimeCell: addresses.startTime,
        forecastDateCell: addresses.forecastDate, forecastTimeCell: addresses.forecastTime, descriptionCell: addresses.description,
        expectedCurrent: initial.baselineValues as Record<string, unknown>, proposed: initial.proposedValues as Record<string, unknown>,
        editableFields: [...OFFICIAL_PILOT_FIELDS], mappingConfirmed: true, backupPath: initial.backupPath,
        backupHash: initial.backupHash, expectedWorkbookHash: initial.originalHash, confirmation: req.body.confirmation
      }, simulation: false, timeoutMs: 90_000
    };

    await prisma.$transaction(async tx => {
      await acquirePilotLock(tx);
      const mode = await tx.generalSetting.findUnique({ where: { key: "OPERATIONAL_MODE" } });
      if (mode?.value !== "LIVE_APPROVAL_PILOT") throw new HttpError(409, `Ative o piloto primeiro com: ${OFFICIAL_PILOT_ACTIVATION}`, { code: "PILOT_ACTIVATION_REQUIRED" });
      const write = await tx.officialPilotWrite.findUnique({ where: { id: initial.id } });
      if (!write || write.status !== "PREVIEW_READY" || write.confirmed) throw new HttpError(409, "Outra confirmação ou escrita já possui o piloto.", { code: "PILOT_WRITE_IN_PROGRESS" });
      const pending = await loadPending(tx, write.pendingChangeId);
      const context = pendingContext(pending);
      const blockers = proposalBlockers(pending, context, write.workbook, Object.values(OFFICIAL_PILOT_POLICY.columns));
      if (blockers.length) throw new HttpError(403, "A lista branca mudou ou não corresponde à pendência.", { code: blockers[0], blockers });
      if (pending.version !== write.pendingVersion || pendingFingerprint(pending, context) !== write.contextHash) throw new HttpError(409, "A pendência mudou após a prévia. Refaça leitura, backup e prévia.", { code: "PILOT_CONTEXT_CONFLICT" });
      const other = await tx.officialPilotWrite.findFirst({ where: { id: { not: write.id }, status: { in: [...activeStatuses] } } });
      if (other) throw new HttpError(409, "Outra escrita ou rollback está em andamento.", { code: "PILOT_WRITE_IN_PROGRESS", writeId: other.id });
      await assertNoOfficialJobRunning(tx);
      await tx.officialPilotWrite.update({ where: { id: write.id }, data: { status: "WRITING", confirmed: true, commandId, userId: user.id, userName: user.name, startedAt: new Date(), completedAt: null, durationMs: null } });
      await tx.officialPilotWriteEvent.create({ data: { writeId: write.id, step: "approval", label: "Aprovação registrada", status: "SUCCESS", userId: user.id, detail: OFFICIAL_PILOT_WRITE_CONFIRMATION } });
      await enqueueOfficialExcelCommand(command, tx);
    });

    const completed = await waitAndReconcile(prisma, command);
    const updated = await loadWrite(prisma, initial.id);
    if (!completed) { res.status(202).json(mapWrite(updated)); return; }
    res.status(writeHttpStatus(updated)).json(mapWrite(updated));
  }));

  router.post("/writes/:id/rollback", asyncHandler(async (req, res) => {
    if (req.body.confirmation !== OFFICIAL_PILOT_ROLLBACK_CONFIRMATION) throw new HttpError(409, `Confirmação exigida: ${OFFICIAL_PILOT_ROLLBACK_CONFIRMATION}`, { code: "PILOT_ROLLBACK_CONFIRMATION_REQUIRED" });
    const user = res.locals.user!;
    const initial = await loadWrite(prisma, String(req.params.id));
    if (initial.status === "ROLLED_BACK") { res.json(mapWrite(initial)); return; }
    if (initial.status === "ROLLBACK_PENDING" && initial.rollbackCommandId) {
      await reconcileOfficialPilotCommand(prisma, initial.rollbackCommandId);
      const current = await loadWrite(prisma, initial.id);
      res.status(current.status === "ROLLBACK_PENDING" ? 202 : writeHttpStatus(current)).json(mapWrite(current));
      return;
    }
    if (!initial.backupHash || !initial.writtenHash || !["VERIFIED", "WRITE_VERIFICATION_FAILED", "FAILED", "ROLLBACK_FAILED"].includes(initial.status)) throw new HttpError(409, "Esta execução não possui backup e hash pós-escrita restauráveis.", { code: "PILOT_ROLLBACK_BLOCKED" });
    const rollbackCommandId = randomUUID();
    const command: ExcelAgentCommand = {
      commandId: rollbackCommandId, correlationId: initial.correlationId, requestedAt: new Date().toISOString(), requestedBy: user.name,
      type: "ROLLBACK_OFFICIAL_PILOT", workbook: initial.workbook, worksheet: initial.worksheet,
      payload: { fleet: initial.fleet, implement: initial.implement, backupPath: initial.backupPath, backupHash: initial.backupHash, expectedCurrentHash: initial.writtenHash, confirmation: req.body.confirmation },
      simulation: false, timeoutMs: 90_000
    };
    await prisma.$transaction(async tx => {
      await acquirePilotLock(tx);
      const write = await tx.officialPilotWrite.findUnique({ where: { id: initial.id } });
      if (!write || !["VERIFIED", "WRITE_VERIFICATION_FAILED", "FAILED", "ROLLBACK_FAILED"].includes(write.status) || !write.backupHash || !write.writtenHash) throw new HttpError(409, "Rollback já solicitado ou não restaurável.", { code: "PILOT_ROLLBACK_IN_PROGRESS" });
      const other = await tx.officialPilotWrite.findFirst({ where: { id: { not: write.id }, status: { in: [...activeStatuses] } } });
      if (other) throw new HttpError(409, "Outra escrita ou rollback está em andamento.", { code: "PILOT_WRITE_IN_PROGRESS", writeId: other.id });
      await assertNoOfficialJobRunning(tx);
      await tx.officialPilotWrite.update({ where: { id: write.id }, data: { status: "ROLLBACK_PENDING", rollbackCommandId, userId: user.id, userName: user.name } });
      await enqueueOfficialExcelCommand(command, tx);
    });
    const completed = await waitAndReconcile(prisma, command);
    const updated = await loadWrite(prisma, initial.id);
    if (!completed) { res.status(202).json(mapWrite(updated)); return; }
    res.status(writeHttpStatus(updated)).json(mapWrite(updated));
  }));

  return router;
}

type Db = PrismaClient | Prisma.TransactionClient;

async function loadPending(db: Db, id: string) {
  const pending = await db.pendingChange.findUnique({ where: { id }, include: { operation: true, incomingMessage: { include: { group: true, parsedMessages: true } } } });
  if (!pending) throw new HttpError(404, "Pendência não encontrada.");
  return pending;
}

async function loadWrite(db: Db, id: string) {
  const write = await db.officialPilotWrite.findUnique({ where: { id }, include: { events: { orderBy: { createdAt: "asc" } } } });
  if (!write) throw new HttpError(404, "Execução do piloto não encontrada.");
  return write;
}

function pendingContext(pending: Awaited<ReturnType<typeof loadPending>>) {
  const parsed = pending.incomingMessage?.parsedMessages.map(item => item.parsedJson as Record<string, unknown>).find(item => String(item.mainEquipment) === pending.equipmentCode);
  const attachments = Array.isArray(parsed?.attachments) ? parsed.attachments.map(String) : [];
  const normalized = (parsed?.normalized ?? {}) as Record<string, unknown>;
  return { groupName: pending.incomingMessage?.group?.name ?? "", groupJid: pending.incomingMessage?.group?.externalId ?? "", operation: pending.operation?.name ?? "", fleet: pending.equipmentCode, implement: attachments[0] ?? "", normalized, source: parsed?.source, correlationId: typeof parsed?.correlationId === "string" ? parsed.correlationId : undefined };
}

function proposalBlockers(pending: Awaited<ReturnType<typeof loadPending>>, context: ReturnType<typeof pendingContext>, workbook: string, columns?: string[]) {
  return [
    ...pilotScopeBlockers({ ...context, workbook, worksheet: OFFICIAL_PILOT_POLICY.worksheet, columns }),
    ...firstPilotProposalBlockers({ currentStatus: pending.currentStatus, newStatus: pending.newStatus, description: pending.description, pendingStatus: pending.status, source: context.source, normalized: context.normalized })
  ];
}

function pendingFingerprint(pending: Awaited<ReturnType<typeof loadPending>>, context: ReturnType<typeof pendingContext>) {
  return createHash("sha256").update(JSON.stringify({ id: pending.id, version: pending.version, status: pending.status, currentStatus: pending.currentStatus, newStatus: pending.newStatus, description: pending.description, incomingMessageId: pending.incomingMessageId, message: pending.incomingMessage?.content, context })).digest("hex");
}

async function acquirePilotLock(tx: Prisma.TransactionClient) {
  const lock = await tx.$queryRaw<Array<{ locked: boolean }>>`SELECT pg_try_advisory_xact_lock(731531830) AS locked`;
  if (!lock[0]?.locked) throw new HttpError(409, "Piloto oficial ocupado por outra operação.", { code: "PILOT_WRITE_IN_PROGRESS" });
}

async function assertNoOfficialJobRunning(tx: Prisma.TransactionClient) {
  const activeJob = await tx.excelAgentJob.findFirst({ where: { scope: "OFFICIAL_PILOT", status: { in: ["QUEUED", "RUNNING"] } } });
  if (activeJob) throw new HttpError(409, "Excel Agent já possui um job oficial em andamento.", { code: "PILOT_WRITE_IN_PROGRESS", commandId: activeJob.commandId });
}

async function waitAndReconcile(prisma: PrismaClient, command: ExcelAgentCommand) {
  try {
    await waitForOfficialExcelResult(command.commandId, (command.timeoutMs ?? 90_000) + 30_000);
  } catch (error) {
    const value = error as Error & { code?: string };
    const job = await prisma.excelAgentJob.findUnique({ where: { commandId: command.commandId } });
    if (job?.status === "RUNNING") return false;
    if (job?.status === "COMPLETED") { await reconcileOfficialPilotCommand(prisma, command.commandId); return true; }
    await finalizeUndispatchedOfficialJob(command, value.code ?? "EXCEL_AGENT_TIMEOUT", value.message);
  }
  await reconcileOfficialPilotCommand(prisma, command.commandId);
  return true;
}

function configuredWorkbook() {
  const workbook = process.env.OFFICIAL_PLANTIO_WORKBOOK?.trim();
  if (!workbook) throw new HttpError(503, "Workbook oficial do piloto não configurado localmente.", { code: "PILOT_WORKBOOK_CONFIG_MISSING" });
  return workbook;
}

function configuredWorkbookForDisplay() { return process.env.OFFICIAL_PLANTIO_WORKBOOK?.trim() || "NÃO CONFIGURADO"; }

function createBackupPath() {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const stamp = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now).replace(/[-: ]/g, "");
  return path.join(backupRoot, date, `Planilha Plantio cana-${stamp}-${randomUUID().slice(0, 8)}.xlsm`);
}

function publicPolicy() {
  const groupJid = configuredPilotGroupJid();
  return { groupName: OFFICIAL_PILOT_POLICY.groupName, groupJidMasked: groupJid ? maskPilotJid(groupJid) : "NÃO CONFIGURADO", operation: OFFICIAL_PILOT_POLICY.operation, workbook: configuredWorkbookForDisplay(), worksheet: OFFICIAL_PILOT_POLICY.worksheet, fleetIds: [OFFICIAL_PILOT_POLICY.fleet], expectedImplement: OFFICIAL_PILOT_POLICY.implement, columns: OFFICIAL_PILOT_POLICY.columns, oneAtATime: true };
}

function mapWrite(write: any) {
  const cells = write.cells ?? {};
  const baseline = write.baselineValues ?? {};
  const proposed = write.proposedValues ?? {};
  const cellRows = OFFICIAL_PILOT_FIELDS.map(field => ({ field, address: cells[field] ?? (write.row ? officialPilotAddresses(write.row)[field] : OFFICIAL_PILOT_POLICY.columns[field]), currentValue: displayExcelValue(field, baseline[field]), proposedValue: proposed[field] ?? null }));
  return { ...write, groupJid: undefined, groupJidMasked: maskPilotJid(write.groupJid), confirmed: Boolean(write.confirmed), cells: cellRows, blockers: write.errorCode ? [write.errorCode] : [], rollbackAvailable: Boolean(write.backupHash && write.writtenHash && ["VERIFIED", "WRITE_VERIFICATION_FAILED", "FAILED", "ROLLBACK_FAILED"].includes(write.status)), confirmationRequired: OFFICIAL_PILOT_WRITE_CONFIRMATION, rollbackConfirmationRequired: OFFICIAL_PILOT_ROLLBACK_CONFIRMATION, externalActions: { sendMessage: false, sendReaction: false }, events: write.events ?? [] };
}

function displayExcelValue(field: string, value: unknown) {
  if (typeof value !== "number") return value ?? null;
  if (field === "startDate" || field === "forecastDate") return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86_400_000));
  if (field === "startTime" || field === "forecastTime") { const minutes = Math.round((value % 1) * 24 * 60); return `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`; }
  return value;
}

function writeHttpStatus(write: { status: string; errorCode?: string | null }) {
  if (["VERIFIED", "ROLLED_BACK"].includes(write.status)) return 200;
  if (["CELL_CONFLICT"].includes(write.status) || ["ROW_CONFLICT", "WORKBOOK_CONFLICT", "ROLLBACK_CONFLICT"].includes(write.errorCode ?? "")) return 409;
  return 422;
}
