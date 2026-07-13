import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { normalizeOperationalExcelUpdate } from "@coa-bot/excel-contracts";
import { parseMessage, parseReport } from "../../services/operational-parser/index.js";
import { maskJid, requireConnectedWhatsApp, resolveAuditUserId, shadowGroupPersistence, shouldCaptureShadowMessage } from "./group-policy.js";

const token = process.env.WHATSAPP_SHADOW_TOKEN ?? "local-dev-whatsapp-shadow";
const here = path.dirname(fileURLToPath(import.meta.url));
const qrPath = process.env.WHATSAPP_QR_PATH ?? path.resolve(here, "../../../../../whatsapp-runtime/qr.png");
const statusMap: Record<string, string> = { RODANDO: "R", PARADO: "P", DISPONIVEL: "D", MANUTENCAO: "P", SEM_OPERACAO: "E" };

export function whatsappShadowRoutes(prisma = new PrismaClient()) {
  const router = Router();
  router.use((req, res, next) => req.header("x-whatsapp-shadow-token") === token ? next() : res.status(401).json({ message: "Token SHADOW inválido." }));
  router.get("/mode", async (_req, res, next) => {
    try { const setting = await prisma.generalSetting.findUnique({ where: { key: "OPERATIONAL_MODE" } }); res.json({ mode: setting?.value ?? "SIMULATION" }); } catch (error) { next(error); }
  });
  router.get("/selected-group", async (_req, res, next) => {
    try { const group = await prisma.whatsAppGroup.findFirst({ where: { isTestGroup: true, isMonitored: true, isActive: true, active: true } }); res.json({ externalId: group?.externalId ?? null }); } catch (error) { next(error); }
  });
  router.get("/refresh-request", async (_req, res, next) => {
    try { const setting = await prisma.generalSetting.findUnique({ where: { key: "WHATSAPP_GROUP_REFRESH" } }); res.json({ version: setting?.version ?? 0 }); } catch (error) { next(error); }
  });
  router.post("/status", async (req, res, next) => {
    try {
      const qrState = String(req.body.qrState ?? (req.body.connected ? "CONNECTED" : "DISCONNECTED"));
      await prisma.integrationStatus.upsert({ where: { kind: "WHATSAPP" }, update: { state: req.body.connected ? "ONLINE" : "OFFLINE", message: `WHATSAPP REAL — MODO SOMENTE LEITURA · ${qrState}` }, create: { kind: "WHATSAPP", state: req.body.connected ? "ONLINE" : "OFFLINE", message: `WHATSAPP REAL — MODO SOMENTE LEITURA · ${qrState}` } });
      await prisma.generalSetting.upsert({ where: { key: "WHATSAPP_SHADOW_STATUS" }, update: { value: { qrState, updatedAt: new Date().toISOString(), ...req.body }, version: { increment: 1 } }, create: { key: "WHATSAPP_SHADOW_STATUS", value: { qrState, updatedAt: new Date().toISOString(), ...req.body } } });
      res.json({ ok: true, sendMessage: false, sendReaction: false });
    } catch (error) { next(error); }
  });
  router.post("/groups", async (req, res, next) => {
    try {
      const syncedAt = new Date();
      for (const group of req.body.groups ?? []) await prisma.whatsAppGroup.upsert({ where: { externalId: group.id }, update: { name: group.name, participantCount: group.participantCount ?? 0, whatsappUpdatedAt: syncedAt, connectionStatus: "shadow-readonly" }, create: { externalId: group.id, name: group.name, participantCount: group.participantCount ?? 0, whatsappUpdatedAt: syncedAt, connectionStatus: "shadow-readonly", receivesReports: false, isMonitored: false, isTestGroup: false } });
      res.json({ ok: true, count: req.body.groups?.length ?? 0 });
    } catch (error) { next(error); }
  });
  router.post("/ignored", async (req, res, next) => {
    try { await prisma.systemLog.create({ data: { action: "WHATSAPP_SHADOW_MESSAGE_IGNORED", message: "Mensagem ignorada por pertencer a grupo não monitorado.", metadata: { groupJid: req.body.groupId, messageId: req.body.messageId, source: "WHATSAPP_SHADOW" }, result: "IGNORED" } }); res.json({ ignored: true }); } catch (error) { next(error); }
  });
  router.post("/messages", async (req, res, next) => {
    try {
      const receivedAt = new Date(req.body.receivedAt);
      const originalText = String(req.body.text ?? "");
      const selected = await prisma.whatsAppGroup.findFirst({ where: { externalId: req.body.groupId, isTestGroup: true, isMonitored: true, isActive: true, active: true } });
      if (!selected || !shouldCaptureShadowMessage(selected.externalId, String(req.body.groupId))) return res.status(202).json({ ignored: true, reason: "GROUP_NOT_SELECTED" });
      const idempotencyKey = createHash("sha256").update(`${req.body.groupId}:${req.body.messageId}`).digest("hex");
      const existing = await prisma.incomingMessage.findUnique({ where: { idempotencyKey } });
      if (existing) { await prisma.systemLog.create({ data: { action: "WHATSAPP_SHADOW_MESSAGE_DUPLICATE", entity: "IncomingMessage", entityId: existing.id, message: "Mensagem duplicada ignorada.", metadata: { groupJid: req.body.groupId, messageId: req.body.messageId }, result: "DUPLICATE" } }); return res.json({ duplicate: true, messageId: existing.id }); }
      const group = await prisma.whatsAppGroup.update({ where: { id: selected.id }, data: { lastMessage: originalText, lastActivity: receivedAt, processedMessages: { increment: 1 }, connectionStatus: "shadow-readonly" } });
      const message = await prisma.incomingMessage.create({ data: { idempotencyKey, groupId: group.id, sender: req.body.sender ?? "desconhecido", content: originalText, receivedAt } });
      const result = await processShadowMessage(prisma, message.id);
      res.status(201).json({ messageId: message.id, ...result, externalActions: false });
    } catch (error) { next(error); }
  });
  return router;
}

export function whatsappShadowPanelRoutes(prisma = new PrismaClient()) {
  const router = Router();
  router.get("/groups", async (req, res, next) => {
    try {
      const query = String(req.query.q ?? "").trim();
      const groups = await prisma.whatsAppGroup.findMany({ where: { externalId: { not: null }, connectionStatus: "shadow-readonly", ...(query ? { name: { contains: query, mode: "insensitive" } } : {}) }, include: { operations: { include: { operation: true } } }, orderBy: { name: "asc" } });
      res.json(groups.map(group => ({ id: group.id, externalId: group.externalId, maskedExternalId: maskJid(group.externalId), name: group.name, participantCount: group.participantCount, whatsappUpdatedAt: group.whatsappUpdatedAt, selected: group.isTestGroup, monitored: group.isMonitored, operation: group.operations[0]?.operation ? { id: group.operations[0].operation.id, name: group.operations[0].operation.name } : null })));
    } catch (error) { next(error); }
  });
  router.post("/groups/refresh", async (_req, res, next) => {
    try {
      const connection = await prisma.integrationStatus.findUnique({ where: { kind: "WHATSAPP" } });
      try { requireConnectedWhatsApp(connection?.state); } catch { return res.status(409).json({ message: "WhatsApp desconectado; não é possível atualizar grupos." }); }
      const request = await prisma.generalSetting.upsert({ where: { key: "WHATSAPP_GROUP_REFRESH" }, update: { value: { requestedAt: new Date().toISOString() }, version: { increment: 1 } }, create: { key: "WHATSAPP_GROUP_REFRESH", value: { requestedAt: new Date().toISOString() } } });
      res.status(202).json({ requested: true, version: request.version });
    } catch (error) { next(error); }
  });
  router.post("/groups/select", async (req, res, next) => {
    try {
      const connection = await prisma.integrationStatus.findUnique({ where: { kind: "WHATSAPP" } });
      try { requireConnectedWhatsApp(connection?.state); } catch { return res.status(409).json({ message: "WhatsApp desconectado; seleção bloqueada." }); }
      const group = await prisma.whatsAppGroup.findUnique({ where: { externalId: String(req.body.externalId) } });
      const operation = await prisma.operation.findUnique({ where: { id: String(req.body.operationId) } });
      if (!group || !operation) return res.status(404).json({ message: "Grupo ou operação não encontrado." });
      const actorId = await resolveAuditUserId(prisma, res.locals.user?.email);
      await prisma.$transaction(async tx => {
        await tx.whatsAppGroup.updateMany({ where: { isTestGroup: true }, data: { isTestGroup: false, isMonitored: false } });
        await tx.whatsAppGroup.update({ where: { id: group.id }, data: { name: group.name, ...shadowGroupPersistence(String(group.externalId)), version: { increment: 1 }, updatedBy: actorId } });
        await tx.groupOperation.deleteMany({ where: { groupId: group.id } });
        await tx.groupOperation.create({ data: { groupId: group.id, operationId: operation.id } });
        await tx.systemLog.create({ data: { userId: actorId, action: "WHATSAPP_SHADOW_GROUP_SELECTED", entity: "WhatsAppGroup", entityId: group.id, message: "Grupo único selecionado para piloto SHADOW.", metadata: { externalId: group.externalId, operationId: operation.id, sendMessage: false, sendReaction: false, officialExcelWrite: false } } });
      });
      res.json({ selected: true, group: { name: group.name, externalId: group.externalId }, operation: operation.name, banner: "GRUPO MONITORADO EM SHADOW", sendMessage: false, sendReaction: false, officialExcelWrite: false });
    } catch (error) { next(error); }
  });
  router.post("/messages/:id/reprocess", async (req, res, next) => {
    try { res.json(await processShadowMessage(prisma, String(req.params.id))); } catch (error) { next(error); }
  });
  router.get("/status", async (_req, res, next) => {
    try {
      const setting = await prisma.generalSetting.findUnique({ where: { key: "WHATSAPP_SHADOW_STATUS" } });
      const value = (setting?.value ?? { qrState: "DISCONNECTED" }) as Record<string, unknown>;
      let qrDataUrl: string | null = null;
      if (value.qrState === "QR_VALID") {
        try { qrDataUrl = `data:image/png;base64,${(await readFile(qrPath)).toString("base64")}`; } catch { value.qrState = "QR_EXPIRED"; }
      }
      res.setHeader("Cache-Control", "no-store");
      const selected = await prisma.whatsAppGroup.findFirst({ where: { isTestGroup: true, isMonitored: true, isActive: true, active: true }, include: { operations: { include: { operation: true } } } });
      const [lastMessage,lastParsed,lastPending,ignored,duplicates,processed] = await Promise.all([
        prisma.incomingMessage.findFirst({where:{groupId:selected?.id},orderBy:{receivedAt:"desc"}}),
        prisma.parsedMessage.findFirst({where:{incomingMessage:{groupId:selected?.id}},orderBy:{id:"desc"}}),
        prisma.pendingChange.findFirst({where:{incomingMessage:{groupId:selected?.id},createdBy:"WHATSAPP_SHADOW"},orderBy:{createdAt:"desc"}}),
        prisma.systemLog.count({where:{action:"WHATSAPP_SHADOW_MESSAGE_IGNORED"}}),prisma.systemLog.count({where:{action:"WHATSAPP_SHADOW_MESSAGE_DUPLICATE"}}),prisma.systemLog.count({where:{action:"WHATSAPP_SHADOW_MESSAGE_PROCESSED",result:"SUCCESS"}})
      ]);
      res.json({ ...value, qrDataUrl, sendMessage: false, sendReaction: false, officialExcelWrite: false, mode: "SHADOW", source:"REAL_SHADOW", monitoredGroup: selected ? { name: selected.name, maskedExternalId: maskJid(selected.externalId), lastMessage: selected.lastMessage, processedMessages: selected.processedMessages, monitoring: "GRUPO MONITORADO EM SHADOW", operation: selected.operations[0]?.operation.name ?? null } : null, pipeline:{lastMessageId:lastMessage?.id??null,lastPersistedMessage:lastMessage?.content??null,lastInterpretation:lastParsed?.parsedJson??null,lastPendingId:lastPending?.id??null,captured:selected?.processedMessages??0,processed,ignored,duplicates,lastError:null} });
    } catch (error) { next(error); }
  });
  return router;
}

export async function processShadowMessage(prisma: PrismaClient, messageId: string) {
  const message = await prisma.incomingMessage.findUniqueOrThrow({ where: { id: messageId }, include: { group: { include: { operations: { include: { operation: true } } } } } });
  const correlationId = randomUUID();
  const report = parseReport(message.content);
  const fallback = parseMessage(message.content, { operation: message.group?.operations[0]?.operation.name });
  const items = report.items.length ? report.items : [fallback];
  const operation = message.group?.operations[0]?.operation ?? null;
  const results = [];
  for (const parsed of items) {
    const status = parsed.proposedStatus ? statusMap[parsed.proposedStatus] : undefined;
    const description = normalizeDescription(parsed.description, status);
    const normalized = normalizeOperationalExcelUpdate({ status, description, receivedAt: message.receivedAt, forecastAt: parsed.forecastAt, forecastInformed: Boolean(parsed.forecastAt) });
    const metadata = { ...parsed, operation: parsed.operation ?? operation?.name ?? null, normalized, source: "WHATSAPP_SHADOW", simulated: false, correlationId, groupJid: message.group?.externalId, rulesApplied: normalized.reasons, candidateCells: candidateCells(operation, parsed.mainEquipment) };
    const existingParsed = await prisma.parsedMessage.findFirst({ where: { incomingMessageId: message.id, parsedJson: { path: ["mainEquipment"], equals: parsed.mainEquipment ?? "__NONE__" } } });
    if (existingParsed) await prisma.parsedMessage.update({ where: { id: existingParsed.id }, data: { confidence: parsed.confidence, parsedJson: metadata } });
    else await prisma.parsedMessage.create({ data: { incomingMessageId: message.id, confidence: parsed.confidence, parsedJson: metadata } });
    let pending = null;
    if (parsed.mainEquipment && normalized.valid) {
      const existing = await prisma.pendingChange.findFirst({ where: { incomingMessageId: message.id, equipmentCode: parsed.mainEquipment, createdBy: "WHATSAPP_SHADOW" } });
      const data = { operationId: operation?.id, currentStatus: existing?.currentStatus ?? "LEITURA_OFICIAL_PENDENTE", newStatus: normalized.status, description: normalized.description, confidence: parsed.confidence, status: "PENDING" as const, active: true, createdBy: "WHATSAPP_SHADOW", updatedBy: null };
      pending = existing ? await prisma.pendingChange.update({ where: { id: existing.id }, data: { ...data, version: { increment: 1 } } }) : await prisma.pendingChange.create({ data: { ...data, incomingMessageId: message.id, equipmentCode: parsed.mainEquipment } });
    }
    results.push({ parsed: metadata, pendingId: pending?.id ?? null });
  }
  await prisma.systemLog.create({ data: { action: "WHATSAPP_SHADOW_MESSAGE_PROCESSED", entity: "IncomingMessage", entityId: message.id, message: "Mensagem real processada no pipeline operacional SHADOW.", metadata: { correlationId, source: "WHATSAPP_SHADOW", simulated: false, itemCount: results.length, pendingIds: results.map(item => item.pendingId), sendMessage: false, sendReaction: false, officialExcelWrite: false }, result: results.every(item => item.pendingId) ? "SUCCESS" : "VALIDATION_REQUIRED" } });
  return { correlationId, source: "WHATSAPP_SHADOW", simulated: false, items: results, pendingIds: results.map(item => item.pendingId).filter(Boolean), externalActions: { sendMessage: false, sendReaction: false, officialExcelWrite: false } };
}

function normalizeDescription(value: string | null, status?: string) {
  if (status === "R") return "RODANDO";
  return String(value ?? "").replace(/^parad[oa],?\s*/i, "").replace(/,?\s*previs[aã]o.+$/i, "").trim().toUpperCase();
}

function candidateCells(operation: { fleetColumn: string | null; implementColumn: string | null; statusColumn: string | null; descriptionColumn: string | null; timeColumn: string | null } | null, fleet: string | null) {
  return { fleet, fleetColumn: operation?.fleetColumn, implementColumn: operation?.implementColumn, statusColumn: operation?.statusColumn, descriptionColumn: operation?.descriptionColumn, timeColumn: operation?.timeColumn, officialExcelWrite: false };
}
