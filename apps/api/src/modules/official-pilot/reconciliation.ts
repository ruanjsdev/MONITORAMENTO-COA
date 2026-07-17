import path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  ExcelCommandResult,
  OFFICIAL_PILOT_FIELDS,
  compareOfficialPilotValues,
  officialPilotAddresses
} from "@coa-bot/excel-contracts";

const labels = {
  baseline: "Baseline validado",
  backup: "Backup criado",
  write: "Escrita executada",
  save: "Arquivo salvo",
  reread: "Releitura confirmada",
  audit: "Evento registrado",
  rollback: "Backup restaurado"
} as const;

type Tx = Prisma.TransactionClient;
type Write = Awaited<ReturnType<Tx["officialPilotWrite"]["findFirstOrThrow"]>>;

export async function reconcileOfficialPilotCommand(prisma: PrismaClient, commandId: string) {
  const job = await prisma.excelAgentJob.findUnique({ where: { commandId } });
  if (job?.status !== "COMPLETED" || !job.result) return null;
  return prisma.$transaction(tx => reconcileOfficialPilotCommandInTransaction(tx, commandId), { timeout: 30_000 });
}

export async function reconcileOfficialPilotCommandInTransaction(tx: Prisma.TransactionClient, commandId: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${commandId}))`;
  const durable = await tx.excelAgentJob.findUnique({ where: { commandId } });
  if (durable?.status !== "COMPLETED" || !durable.result) return null;
  const write = await tx.officialPilotWrite.findFirst({
    where: { OR: [{ prepareCommandId: commandId }, { commandId }, { rollbackCommandId: commandId }] }
  });
  if (!write) {
    await tx.excelAgentJob.update({ where: { id: durable.id }, data: { reconciledAt: new Date() } });
    return null;
  }
  const result = durable.result as unknown as ExcelCommandResult;
  const reconciled = write.prepareCommandId === commandId
    ? await reconcilePrepare(tx, write, result)
    : write.commandId === commandId
      ? await reconcileWrite(tx, write, result)
      : write.rollbackCommandId === commandId
        ? await reconcileRollback(tx, write, result)
        : write;
  await tx.excelAgentJob.update({ where: { id: durable.id }, data: { reconciledAt: new Date() } });
  return reconciled;
}

export async function reconcileCompletedOfficialPilotJobs(prisma = new PrismaClient()) {
  const jobs = await prisma.excelAgentJob.findMany({
    where: { scope: "OFFICIAL_PILOT", status: "COMPLETED", reconciledAt: null, result: { not: Prisma.JsonNull } },
    orderBy: { completedAt: "asc" },
    take: 100,
    select: { commandId: true }
  });
  for (const job of jobs) await reconcileOfficialPilotCommand(prisma, job.commandId);
}

async function reconcilePrepare(tx: Tx, write: Write, result: ExcelCommandResult) {
  if (write.status !== "PREPARING") return write;
  const userId = await validUserId(tx, write.userId ?? undefined);
  if (!result.success) {
    await failedEvent(tx, write.id, result, userId, "prepare");
    return tx.officialPilotWrite.update({ where: { id: write.id }, data: failureData(result, false) });
  }

  let prepared: PreparedResult;
  try { prepared = validatePreparedResult(write, result.result); }
  catch (error) {
    const invalid = invalidResult(result, error);
    await failedEvent(tx, write.id, invalid, userId, "prepare");
    return tx.officialPilotWrite.update({ where: { id: write.id }, data: failureData(invalid, false) });
  }
  const pending = await tx.pendingChange.findUnique({ where: { id: write.pendingChangeId } });
  if (!pending || pending.version !== write.pendingVersion || pending.status !== "PENDING") {
    const invalid = invalidResult(result, Object.assign(new Error("A pendência mudou durante a preparação."), { code: "PILOT_CONTEXT_CONFLICT" }));
    await failedEvent(tx, write.id, invalid, userId, "prepare");
    return tx.officialPilotWrite.update({ where: { id: write.id }, data: failureData(invalid, false) });
  }

  await tx.officialPilotWriteEvent.createMany({ data: [
    { writeId: write.id, step: "backup", label: labels.backup, status: "SUCCESS", userId, detail: `SHA-256 ${prepared.backupHash}`, data: { path: prepared.backupPath, originalHash: prepared.originalHash, backupHash: prepared.backupHash, sizeBytes: prepared.sizeBytes }, durationMs: result.duration },
    { writeId: write.id, step: "preview", label: "Prévia pronta", status: "SUCCESS", userId, detail: "confirmed=false; nenhuma célula foi escrita.", data: { row: prepared.row, cells: prepared.cells, current: prepared.current, proposed: write.proposedValues } as never }
  ] });
  await tx.systemLog.create({ data: {
    userId, action: "OFFICIAL_PILOT_PREVIEW_READY", entity: "OfficialPilotWrite", entityId: write.id,
    message: `Prévia oficial pronta para a frota ${write.fleet}; confirmed=false.`,
    beforeValue: prepared.current as never, afterValue: write.proposedValues as never,
    metadata: { commandId: write.prepareCommandId, correlationId: write.correlationId, workbook: write.workbook, worksheet: write.worksheet, row: prepared.row, cells: prepared.cells, backupPath: prepared.backupPath, originalHash: prepared.originalHash, backupHash: prepared.backupHash, sendMessage: false, sendReaction: false } as never
  } });
  return tx.officialPilotWrite.update({ where: { id: write.id }, data: {
    status: "PREVIEW_READY", confirmed: false, row: prepared.row, cells: prepared.cells as never,
    baselineValues: prepared.current as never, originalHash: prepared.originalHash, backupHash: prepared.backupHash,
    sizeBytes: prepared.sizeBytes, result: "PREVIEW_READY", errorCode: null, errorMessage: null,
    durationMs: result.duration, completedAt: new Date(result.completedAt)
  } });
}

async function reconcileWrite(tx: Tx, write: Write, result: ExcelCommandResult) {
  if (["VERIFIED", "CELL_CONFLICT", "WRITE_VERIFICATION_FAILED", "FAILED", "ROLLED_BACK", "ROLLBACK_PENDING", "ROLLBACK_FAILED"].includes(write.status)) return write;
  if (!["APPROVAL_RECORDED", "WRITING", "SAVED"].includes(write.status)) return write;
  const userId = await validUserId(tx, write.userId ?? undefined);
  if (!result.success) {
    const details = object(result.error?.details);
    const writtenHash = validSha256(details.writtenHash) ? String(details.writtenHash).toUpperCase() : null;
    await failedEvent(tx, write.id, result, userId, result.error?.code === "CELL_CONFLICT" ? "baseline" : "write");
    await fallbackToShadow(tx, write.id, result.error?.code ?? "FAILED");
    await tx.systemLog.create({ data: {
      userId, action: "OFFICIAL_PILOT_WRITE_BLOCKED", entity: "OfficialPilotWrite", entityId: write.id,
      message: "Escrita oficial bloqueada ou falhou; modo retornado a SHADOW.",
      metadata: { commandId: write.commandId, correlationId: write.correlationId, error: result.error, writtenHash, sendMessage: false, sendReaction: false } as never,
      result: "BLOCKED"
    } });
    return tx.officialPilotWrite.update({ where: { id: write.id }, data: {
      ...failureData(result, true), writtenHash,
      status: result.error?.code === "CELL_CONFLICT" ? "CELL_CONFLICT" : result.error?.code === "WRITE_VERIFICATION_FAILED" ? "WRITE_VERIFICATION_FAILED" : "FAILED"
    } });
  }

  let output: ApplyResult;
  try { output = validateApplyResult(write, result.result); }
  catch (error) {
    const invalid = invalidResult(result, error);
    const candidate = object(result.result);
    const writtenHash = validSha256(candidate.writtenHash) ? String(candidate.writtenHash).toUpperCase() : null;
    await failedEvent(tx, write.id, invalid, userId, "reread");
    await fallbackToShadow(tx, write.id, invalid.error?.code ?? "WRITE_VERIFICATION_FAILED");
    return tx.officialPilotWrite.update({ where: { id: write.id }, data: { ...failureData(invalid, true), status: "WRITE_VERIFICATION_FAILED", writtenHash, rereadValues: object(candidate.values) as never } });
  }

  const completedAt = new Date(result.completedAt);
  await tx.officialPilotWriteEvent.createMany({ data: [
    { writeId: write.id, step: "baseline", label: labels.baseline, status: "SUCCESS", userId, detail: "Hash integral e H, K, L, M, N e S conferem com a prévia." },
    { writeId: write.id, step: "write", label: labels.write, status: "SUCCESS", userId, detail: "Somente células da whitelist foram alteradas." },
    { writeId: write.id, step: "save", label: labels.save, status: "SUCCESS", userId, detail: `Workbook.Save confirmado; SHA-256 ${output.writtenHash}.` },
    { writeId: write.id, step: "reread", label: labels.reread, status: "SUCCESS", userId, detail: "Valores salvos iguais aos propostos.", data: output.values as never, durationMs: result.duration },
    { writeId: write.id, step: "audit", label: labels.audit, status: "SUCCESS", userId, detail: "Evento operacional e auditoria PostgreSQL registrados." }
  ] });
  await tx.pendingChange.update({ where: { id: write.pendingChangeId }, data: { status: "APPROVED", updatedBy: userId, version: { increment: 1 } } });
  await tx.approvedChange.upsert({ where: { pendingChangeId: write.pendingChangeId }, update: { simulated: false, approvedAt: completedAt }, create: { pendingChangeId: write.pendingChangeId, simulated: false } });
  await tx.operationalEvent.create({ data: {
    timestamp: completedAt, type: "OFFICIAL_EXCEL_WRITE_VERIFIED", operation: write.operation, fleet: write.fleet,
    implement: write.implement, groupName: write.groupName, userName: write.userName,
    previousStatus: String(object(write.baselineValues).status ?? ""), newStatus: String(object(write.proposedValues).status ?? ""),
    previousDescription: String(object(write.baselineValues).description ?? ""), newDescription: String(object(write.proposedValues).description ?? ""),
    source: "WHATSAPP_SHADOW_LIVE_APPROVAL_PILOT", originalMessage: write.originalMessage,
    observation: `commandId=${write.commandId}; correlationId=${write.correlationId}; backup=${write.backupPath}; writtenHash=${output.writtenHash}`,
    simulated: false, approved: true, responsible: write.userName, priority: "high"
  } });
  await tx.systemLog.create({ data: {
    userId, action: "OFFICIAL_PILOT_WRITE_VERIFIED", entity: "OfficialPilotWrite", entityId: write.id,
    message: "Escrita oficial verificada e auditada; piloto voltou a SHADOW.",
    beforeValue: write.baselineValues as never, afterValue: output.values as never,
    metadata: { commandId: write.commandId, correlationId: write.correlationId, proposed: write.proposedValues, backupPath: write.backupPath, originalHash: write.originalHash, backupHash: write.backupHash, writtenHash: output.writtenHash, durationMs: result.duration, sendMessage: false, sendReaction: false } as never
  } });
  await tx.generalSetting.upsert({ where: { key: "OPERATIONAL_MODE" }, update: { value: "SHADOW", version: { increment: 1 } }, create: { key: "OPERATIONAL_MODE", value: "SHADOW" } });
  return tx.officialPilotWrite.update({ where: { id: write.id }, data: {
    status: "VERIFIED", rereadValues: output.values as never, writtenHash: output.writtenHash,
    result: "VERIFIED", errorCode: null, errorMessage: null, durationMs: result.duration, completedAt
  } });
}

async function reconcileRollback(tx: Tx, write: Write, result: ExcelCommandResult) {
  if (write.status === "ROLLED_BACK") return write;
  if (write.status !== "ROLLBACK_PENDING") return write;
  const userId = await validUserId(tx, write.userId ?? undefined);
  if (!result.success) {
    await failedEvent(tx, write.id, result, userId, "rollback");
    return tx.officialPilotWrite.update({ where: { id: write.id }, data: { ...failureData(result, true), status: "ROLLBACK_FAILED" } });
  }

  let output: RollbackResult;
  try { output = validateRollbackResult(write, result.result); }
  catch (error) {
    const invalid = invalidResult(result, error);
    await failedEvent(tx, write.id, invalid, userId, "rollback");
    return tx.officialPilotWrite.update({ where: { id: write.id }, data: { ...failureData(invalid, true), status: "ROLLBACK_FAILED" } });
  }
  const completedAt = new Date(result.completedAt);
  await tx.officialPilotWriteEvent.create({ data: { writeId: write.id, step: "rollback", label: labels.rollback, status: "SUCCESS", userId, detail: `Hash restaurado: ${output.restoredHash}`, data: output as never, durationMs: result.duration } });
  await tx.operationalEvent.create({ data: {
    timestamp: completedAt, type: "OFFICIAL_EXCEL_ROLLBACK_VERIFIED", operation: write.operation, fleet: write.fleet,
    implement: write.implement, groupName: write.groupName, userName: write.userName,
    previousStatus: String(object(write.proposedValues).status ?? ""), newStatus: String(object(write.baselineValues).status ?? ""),
    previousDescription: String(object(write.proposedValues).description ?? ""), newDescription: String(object(write.baselineValues).description ?? ""),
    source: "LIVE_APPROVAL_PILOT_ROLLBACK", originalMessage: write.originalMessage,
    observation: `rollbackCommandId=${write.rollbackCommandId}; backupHash=${write.backupHash}`,
    simulated: false, approved: true, responsible: write.userName, priority: "high"
  } });
  await tx.pendingChange.update({ where: { id: write.pendingChangeId }, data: { status: "DEFERRED", updatedBy: userId, version: { increment: 1 } } });
  await tx.systemLog.create({ data: {
    userId, action: "OFFICIAL_PILOT_BACKUP_RESTORED", entity: "OfficialPilotWrite", entityId: write.id,
    message: "Backup oficial restaurado com confirmação humana, conflito e hash validados.",
    metadata: { commandId: write.rollbackCommandId, correlationId: write.correlationId, backupPath: write.backupPath, backupHash: write.backupHash, previousWrittenHash: write.writtenHash, output, sendMessage: false, sendReaction: false } as never
  } });
  return tx.officialPilotWrite.update({ where: { id: write.id }, data: {
    status: "ROLLED_BACK", result: "ROLLED_BACK", rereadValues: output.values as never,
    errorCode: null, errorMessage: null, rolledBackAt: completedAt, completedAt, durationMs: result.duration
  } });
}

function validatePreparedResult(write: Write, value: unknown): PreparedResult {
  const result = object(value);
  const row = Number(result.row);
  if (!Number.isInteger(row) || row <= 7) throw coded("EXCEL_RESULT_INVALID", "Linha inválida no resultado de preparação.");
  const cells = object(result.cells);
  const expectedCells = officialPilotAddresses(row);
  if (OFFICIAL_PILOT_FIELDS.some(field => cells[field] !== expectedCells[field])) throw coded("EXCEL_RESULT_INVALID", "Células retornadas divergem da whitelist.");
  const current = object(result.current);
  if (String(current.status ?? "").trim().toUpperCase() !== "P") throw coded("PILOT_BASELINE_STATUS_BLOCKED", "A célula oficial H deve estar em P.");
  const originalHash = String(result.originalHash ?? "").toUpperCase();
  const backupHash = String(result.backupHash ?? "").toUpperCase();
  if (!validSha256(originalHash) || originalHash !== backupHash) throw coded("BACKUP_HASH_MISMATCH", "Hashes original e backup não são idênticos.");
  if (normalizePath(String(result.backupPath ?? "")) !== normalizePath(write.backupPath)) throw coded("EXCEL_RESULT_INVALID", "Caminho de backup retornado diverge do comando.");
  if (String(result.workbook ?? "").toLowerCase() !== write.workbook.toLowerCase() || result.worksheet !== write.worksheet || String(result.fleet) !== write.fleet || String(result.implement) !== write.implement) throw coded("EXCEL_RESULT_INVALID", "Escopo retornado pelo Excel Agent diverge da escrita.");
  const formulas = object(result.formulas);
  if (OFFICIAL_PILOT_FIELDS.some(field => String(formulas[field] ?? "").startsWith("="))) throw coded("FORMULA_PROTECTED", "A whitelist contém célula com fórmula.");
  const sizeBytes = Number(result.sizeBytes);
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) throw coded("EXCEL_RESULT_INVALID", "Tamanho do workbook inválido.");
  return { row, cells: cells as Record<string, string>, current, originalHash, backupPath: String(result.backupPath), backupHash, sizeBytes };
}

function validateApplyResult(write: Write, value: unknown): ApplyResult {
  const result = object(value);
  const values = object(result.values);
  const writtenHash = String(result.writtenHash ?? "").toUpperCase();
  const differences = compareOfficialPilotValues(object(write.proposedValues), values);
  if (result.saved !== true || result.verified !== true || !validSha256(writtenHash) || differences.length) throw coded("WRITE_VERIFICATION_FAILED", `Resultado pós-escrita inválido: ${JSON.stringify(differences)}`);
  return { saved: true, verified: true, values, writtenHash };
}

function validateRollbackResult(write: Write, value: unknown): RollbackResult {
  const result = object(value);
  const restoredHash = String(result.restoredHash ?? "").toUpperCase();
  const backupHash = String(result.backupHash ?? "").toUpperCase();
  const values = object(result.values);
  if (result.restored !== true || !write.backupHash || restoredHash !== write.backupHash.toUpperCase() || backupHash !== restoredHash) throw coded("ROLLBACK_VERIFICATION_FAILED", "Hash restaurado diverge do backup auditado.");
  const differences = compareOfficialPilotValues(object(write.baselineValues), values);
  if (differences.length) throw coded("ROLLBACK_VERIFICATION_FAILED", `Valores restaurados divergem do baseline: ${JSON.stringify(differences)}`);
  return { restored: true, restoredHash, backupHash, values };
}

async function failedEvent(tx: Tx, writeId: string, result: ExcelCommandResult, userId: string | undefined, step: string) {
  await tx.officialPilotWriteEvent.create({ data: { writeId, step, label: step === "rollback" ? labels.rollback : "Execução bloqueada", status: "FAILED", userId, detail: result.error?.message, data: { code: result.error?.code, details: result.error?.details } as never, durationMs: result.duration } });
}

async function fallbackToShadow(tx: Tx, writeId: string, reason: string) {
  await tx.generalSetting.upsert({ where: { key: "OPERATIONAL_MODE" }, update: { value: "SHADOW", version: { increment: 1 } }, create: { key: "OPERATIONAL_MODE", value: "SHADOW" } });
  await tx.systemLog.create({ data: { action: "OFFICIAL_PILOT_FALLBACK_SHADOW", entity: "OfficialPilotWrite", entityId: writeId, message: "Autorização one-shot encerrada; sistema retornou a SHADOW.", metadata: { reason, sendMessage: false, sendReaction: false, officialExcelWrite: false } } });
}

async function validUserId(tx: Tx, userId?: string) {
  if (!userId) return undefined;
  return (await tx.user.findUnique({ where: { id: userId }, select: { id: true } }))?.id;
}

function failureData(result: ExcelCommandResult, confirmed: boolean) {
  return { confirmed, status: "FAILED" as const, result: result.error?.code ?? "EXCEL_COMMAND_FAILED", errorCode: result.error?.code ?? "EXCEL_COMMAND_FAILED", errorMessage: result.error?.message ?? "Falha no Excel Agent.", durationMs: result.duration, completedAt: new Date(result.completedAt) };
}

function invalidResult(base: ExcelCommandResult, error: unknown): ExcelCommandResult {
  const value = error as Error & { code?: string };
  return { ...base, success: false, error: { code: value.code ?? "EXCEL_RESULT_INVALID", message: value.message } };
}

function object(value: unknown): Record<string, any> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {}; }
function validSha256(value: unknown) { return /^[a-f\d]{64}$/i.test(String(value ?? "")); }
function normalizePath(value: string) { return path.resolve(value).toLowerCase(); }
function coded(code: string, message: string) { return Object.assign(new Error(message), { code }); }

type PreparedResult = { row: number; cells: Record<string, string>; current: Record<string, unknown>; originalHash: string; backupPath: string; backupHash: string; sizeBytes: number };
type ApplyResult = { saved: true; verified: true; values: Record<string, unknown>; writtenHash: string };
type RollbackResult = { restored: true; restoredHash: string; backupHash: string; values: Record<string, unknown> };
