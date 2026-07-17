import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { Router } from "express";
import { ExcelAgentCommand, ExcelCommandResult } from "@coa-bot/excel-contracts";
import { HttpError } from "../../errors/http-error.js";

type Queued = { command: ExcelAgentCommand; status: "QUEUED" | "RUNNING" | "COMPLETED" | "CANCELLED"; attempts: number; createdAt: string; result?: ExcelCommandResult };
const queue: Queued[] = [];
const waiters = new Map<string, Array<(result: ExcelCommandResult) => void>>();
const prisma = new PrismaClient();
let agentStatus: unknown = { online: false };
const officialTypes = new Set(["PREPARE_OFFICIAL_PILOT", "APPLY_OFFICIAL_PILOT", "ROLLBACK_OFFICIAL_PILOT"]);
let officialResultHandler: ((commandId: string) => Promise<unknown>) | undefined;

export function registerOfficialExcelResultHandler(handler: (commandId: string) => Promise<unknown>) {
  officialResultHandler = handler;
}

export function enqueueExcelCommand(command: ExcelAgentCommand) {
  if (officialTypes.has(command.type)) throw new Error("Use enqueueOfficialExcelCommand para comandos oficiais.");
  const existing = queue.find(item => item.command.commandId === command.commandId);
  if (existing) return existing.command;
  queue.push({ command: withExpiry(command), status: "QUEUED", attempts: 0, createdAt: new Date().toISOString() });
  return command;
}

export async function enqueueOfficialExcelCommand(command: ExcelAgentCommand, db: PrismaClient | Prisma.TransactionClient = prisma) {
  const durable = withExpiry(command);
  await db.excelAgentJob.upsert({
    where: { commandId: durable.commandId },
    update: {},
    create: { commandId: durable.commandId, correlationId: durable.correlationId, type: durable.type, scope: "OFFICIAL_PILOT", command: durable as never, expiresAt: new Date(durable.expiresAt as string) }
  });
  return durable;
}

export async function finalizeUndispatchedOfficialJob(command: ExcelAgentCommand, code: string, message: string) {
  const result: ExcelCommandResult = {
    commandId: command.commandId, correlationId: command.correlationId, type: command.type,
    success: false, error: { code, message }, duration: 0, completedAt: new Date().toISOString(),
    simulation: command.simulation, executed: false, macrosExecuted: false, officialWorkbookTouched: false
  };
  const updated = await prisma.excelAgentJob.updateMany({
    where: { commandId: command.commandId, status: { in: ["QUEUED", "CANCELLED", "EXPIRED"] } },
    data: { status: "COMPLETED", result: result as never, completedAt: new Date() }
  });
  if (updated.count) await officialResultHandler?.(command.commandId);
  return updated.count > 0;
}

export function waitForExcelResult(commandId: string, timeoutMs = 90_000): Promise<ExcelCommandResult> {
  const current = queue.find(item => item.command.commandId === commandId);
  if (current?.result) return Promise.resolve(current.result);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const listeners = waiters.get(commandId) ?? [];
      waiters.set(commandId, listeners.filter(listener => listener !== finish));
      if (current?.status === "QUEUED") current.status = "CANCELLED";
      reject(Object.assign(new Error("Excel Agent não respondeu dentro do prazo."), { code: "EXCEL_AGENT_TIMEOUT" }));
    }, timeoutMs);
    const finish = (result: ExcelCommandResult) => { clearTimeout(timer); resolve(result); };
    waiters.set(commandId, [...(waiters.get(commandId) ?? []), finish]);
  });
}

export async function waitForOfficialExcelResult(commandId: string, timeoutMs = 120_000): Promise<ExcelCommandResult> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const job = await prisma.excelAgentJob.findUnique({ where: { commandId } });
    if (!job) throw Object.assign(new Error("Job oficial durável não encontrado."), { code: "EXCEL_JOB_NOT_FOUND" });
    if (job.status === "COMPLETED" && job.result) return job.result as unknown as ExcelCommandResult;
    if (job.status === "CANCELLED" || job.status === "EXPIRED") throw Object.assign(new Error(`Job oficial ${job.status.toLowerCase()}.`), { code: `EXCEL_JOB_${job.status}` });
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  const job = await prisma.excelAgentJob.findUnique({ where: { commandId } });
  if (job?.status === "QUEUED") await prisma.excelAgentJob.update({ where: { commandId }, data: { status: "EXPIRED" } });
  throw Object.assign(new Error("Excel Agent não concluiu o job oficial dentro do prazo seguro."), { code: "EXCEL_AGENT_TIMEOUT" });
}

export function excelAgentPublicRoutes() {
  const router = Router();
  router.use((req, res, next) => {
    const token = process.env.EXCEL_AGENT_TOKEN;
    if (!token || token.length < 32) return res.status(503).json({ message: "EXCEL_AGENT_TOKEN forte não configurado." });
    if (req.header("x-excel-agent-token") !== token) return res.status(401).json({ message: "Token do agente inválido." });
    next();
  });
  router.post("/register", (req, res) => { agentStatus = { ...req.body, online: true, lastHeartbeat: new Date().toISOString() }; res.json({ ok: true }); });
  router.post("/heartbeat", (req, res) => { agentStatus = { ...req.body, online: true, lastHeartbeat: new Date().toISOString() }; res.json({ ok: true }); });
  router.get("/status", (_req, res) => {
    const status = agentStatus as { lastHeartbeat?: string };
    const fresh = Boolean(status.lastHeartbeat) && Date.now() - new Date(status.lastHeartbeat as string).getTime() < 15_000;
    res.json({ ...status, online: fresh });
  });
  router.get("/commands/next", async (_req, res, next) => {
    try {
      const now = new Date();
      await prisma.excelAgentJob.updateMany({ where: { scope: "OFFICIAL_PILOT", status: "QUEUED", expiresAt: { lte: now } }, data: { status: "EXPIRED" } });
      const job = await prisma.excelAgentJob.findFirst({ where: { scope: "OFFICIAL_PILOT", status: "QUEUED", expiresAt: { gt: now } }, orderBy: { createdAt: "asc" } });
      if (job) {
        const claimed = await prisma.excelAgentJob.updateMany({ where: { id: job.id, status: "QUEUED" }, data: { status: "RUNNING", leasedAt: now, attempts: { increment: 1 } } });
        if (claimed.count === 1) return res.json(job.command);
      }
      const item = queue.find(candidate => candidate.status === "QUEUED" && !expired(candidate.command));
      for (const stale of queue.filter(candidate => candidate.status === "QUEUED" && expired(candidate.command))) stale.status = "CANCELLED";
      if (!item) return res.status(204).end();
      item.status = "RUNNING";
      item.attempts++;
      res.json(item.command);
    } catch (error) { next(error); }
  });
  router.post("/commands/:id/result", async (req, res, next) => {
    try {
      const job = await prisma.excelAgentJob.findUnique({ where: { commandId: req.params.id } });
      if (job) {
        const command = job.command as unknown as ExcelAgentCommand;
        const result = validateExcelResultEnvelope(req.body, command);
        if (job.status === "COMPLETED") {
          await officialResultHandler?.(job.commandId);
          return res.json({ ok: true, duplicate: true });
        }
        if (job.status !== "RUNNING") return res.status(409).json({ message: `Job oficial em estado ${job.status}; resultado rejeitado.` });
        await prisma.excelAgentJob.update({ where: { id: job.id }, data: { status: "COMPLETED", result: result as never, completedAt: new Date() } });
        await officialResultHandler?.(job.commandId);
        return res.json({ ok: true, durable: true });
      }
      const item = queue.find(candidate => candidate.command.commandId === req.params.id);
      if (!item) return res.status(404).json({ message: "Comando não encontrado." });
      item.result = validateExcelResultEnvelope(req.body, item.command);
      item.status = "COMPLETED";
      for (const resolve of waiters.get(req.params.id) ?? []) resolve(item.result);
      waiters.delete(req.params.id);
      res.json({ ok: true });
    } catch (error) { next(error); }
  });
  return router;
}

export function excelHomologationRoutes() {
  const router = Router();
  router.get("/status", (_req, res) => res.json({ agent: agentStatus, commands: queue.slice(-50).reverse() }));
  router.post("/commands", (req, res) => {
    if (officialTypes.has(String(req.body.type))) return res.status(403).json({ message: "Comandos oficiais só podem ser criados pelo fluxo autenticado do piloto." });
    if (["OPEN_DEV_WORKBOOK", "OPEN_LOCAL_WORKBOOK", "OPEN_LOCAL_FOLDER"].includes(String(req.body.type))) return res.status(403).json({ message: "Abertura de planilha deve usar a whitelist /excel/local-workbooks.", code: "LOCAL_WORKBOOK_WHITELIST_REQUIRED" });
    if (String(req.body.type) === "APPLY_CHANGE" && req.body.simulation === false) return res.status(403).json({ message: "Escrita local exige prévia, backup e confirmação da rota operacional local.", code: "LOCAL_APPROVAL_REQUIRED" });
    const command: ExcelAgentCommand = { commandId: randomUUID(), correlationId: req.body.correlationId ?? randomUUID(), requestedAt: new Date().toISOString(), requestedBy: res.locals.user?.name ?? "Operador", type: req.body.type, workbook: req.body.workbook, worksheet: req.body.worksheet, payload: req.body.payload ?? {}, simulation: req.body.simulation !== false, timeoutMs: req.body.timeoutMs ?? 30_000 };
    enqueueExcelCommand(command);
    res.status(201).json(command);
  });
  router.post("/commands/:id/cancel", (req, res) => {
    const item = queue.find(candidate => candidate.command.commandId === req.params.id);
    if (!item) return res.status(404).json({ message: "Comando de homologação não encontrado." });
    if (item.status === "RUNNING" || item.status === "COMPLETED") return res.status(409).json({ message: "Comando em execução ou concluído não pode ser cancelado por esta rota." });
    item.status = "CANCELLED";
    res.json(item);
  });
  return router;
}

function withExpiry(command: ExcelAgentCommand): ExcelAgentCommand { return { ...command, expiresAt: command.expiresAt ?? new Date(new Date(command.requestedAt).getTime() + (command.timeoutMs ?? 30_000)).toISOString() }; }
function expired(command: ExcelAgentCommand) { return Date.now() > new Date(command.expiresAt ?? new Date(command.requestedAt).getTime() + (command.timeoutMs ?? 30_000)).getTime(); }
export function validateExcelResultEnvelope(value: unknown, command: ExcelAgentCommand): ExcelCommandResult {
  const result = value as Partial<ExcelCommandResult>;
  const completedAt = new Date(String(result.completedAt ?? ""));
  if (
    result.commandId !== command.commandId || result.correlationId !== command.correlationId || result.type !== command.type ||
    typeof result.success !== "boolean" || result.simulation !== command.simulation || typeof result.executed !== "boolean" ||
    result.macrosExecuted !== false || typeof result.officialWorkbookTouched !== "boolean" ||
    !Number.isFinite(result.duration) || Number(result.duration) < 0 || Number.isNaN(completedAt.getTime())
  ) throw invalidEnvelope("Envelope de resultado do Excel Agent inválido.");
  if (officialTypes.has(command.type)) {
    if (result.success && (result.executed !== true || result.officialWorkbookTouched !== true || !result.result)) throw invalidEnvelope("Resultado oficial bem-sucedido sem execução e escopo comprovados.");
    if (!result.success && (!result.error?.code || !result.error.message)) throw invalidEnvelope("Falha oficial sem código e mensagem.");
    const output = result.result as Record<string, unknown> | undefined;
    if (result.success && command.type === "PREPARE_OFFICIAL_PILOT" && (!validSha256(output?.originalHash) || !validSha256(output?.backupHash))) throw invalidEnvelope("Resultado de preparação sem hashes SHA-256.");
    if (result.success && command.type === "APPLY_OFFICIAL_PILOT" && (output?.saved !== true || output?.verified !== true || !validSha256(output?.writtenHash))) throw invalidEnvelope("Resultado de escrita sem salvamento, releitura e hash.");
    if (result.success && command.type === "ROLLBACK_OFFICIAL_PILOT" && (output?.restored !== true || !validSha256(output?.restoredHash))) throw invalidEnvelope("Resultado de rollback sem restauração e hash.");
  }
  return result as ExcelCommandResult;
}

function validSha256(value: unknown) { return /^[a-f\d]{64}$/i.test(String(value ?? "")); }
function invalidEnvelope(message: string) { return new HttpError(400, message); }
