import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { normalizeOperationalExcelUpdate } from "@coa-bot/excel-contracts";
import { parseMessage } from "../../services/operational-parser/index.js";
import { maskJid, requireConnectedWhatsApp, shadowGroupPersistence, shouldCaptureShadowMessage } from "./group-policy.js";

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
  router.post("/messages", async (req, res, next) => {
    try {
      const receivedAt = new Date(req.body.receivedAt);
      const originalText = String(req.body.text ?? "");
      const selected = await prisma.whatsAppGroup.findFirst({ where: { externalId: req.body.groupId, isTestGroup: true, isMonitored: true, isActive: true, active: true } });
      if (!selected || !shouldCaptureShadowMessage(selected.externalId, String(req.body.groupId))) return res.status(202).json({ ignored: true, reason: "GROUP_NOT_SELECTED" });
      const idempotencyKey = createHash("sha256").update(String(req.body.messageId)).digest("hex");
      const existing = await prisma.incomingMessage.findUnique({ where: { idempotencyKey } });
      if (existing) return res.json({ duplicate: true, messageId: existing.id });
      const group = await prisma.whatsAppGroup.update({ where: { id: selected.id }, data: { lastMessage: originalText, lastActivity: receivedAt, processedMessages: { increment: 1 }, connectionStatus: "shadow-readonly" } });
      const parsed = parseMessage(originalText);
      const status = parsed.proposedStatus ? statusMap[parsed.proposedStatus] : undefined;
      const normalized = normalizeOperationalExcelUpdate({ status, description: parsed.description, receivedAt, forecastAt: parsed.forecastAt, forecastInformed: Boolean(parsed.forecastAt) });
      const message = await prisma.incomingMessage.create({ data: { idempotencyKey, groupId: group.id, sender: req.body.sender ?? "desconhecido", content: originalText, receivedAt } });
      await prisma.parsedMessage.create({ data: { incomingMessageId: message.id, confidence: parsed.confidence, parsedJson: { ...parsed, normalized } } });
      let pending = null;
      if (parsed.mainEquipment && normalized.valid) {
        const operation = parsed.operation ? await prisma.operation.findFirst({ where: { name: { contains: parsed.operation, mode: "insensitive" } } }) : null;
        pending = await prisma.pendingChange.create({ data: { incomingMessageId: message.id, operationId: operation?.id, equipmentCode: parsed.mainEquipment, currentStatus: "DESCONHECIDO", newStatus: normalized.status, description: normalized.description, confidence: parsed.confidence, createdBy: "WHATSAPP_SHADOW" } });
      }
      await prisma.systemLog.create({ data: { action: "WHATSAPP_SHADOW_MESSAGE_RECEIVED", entity: "IncomingMessage", entityId: message.id, message: "Mensagem real recebida em modo somente leitura.", metadata: { group: group.name, sender: req.body.sender, parsed, normalized, sendMessage: false, sendReaction: false }, result: normalized.valid ? "SUCCESS" : "VALIDATION_REQUIRED" } });
      res.status(201).json({ messageId: message.id, pendingId: pending?.id, parsed, normalized, externalActions: false });
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
      await prisma.$transaction(async tx => {
        await tx.whatsAppGroup.updateMany({ where: { isTestGroup: true }, data: { isTestGroup: false, isMonitored: false } });
        await tx.whatsAppGroup.update({ where: { id: group.id }, data: { name: group.name, ...shadowGroupPersistence(String(group.externalId)), version: { increment: 1 }, updatedBy: res.locals.user?.id } });
        await tx.groupOperation.deleteMany({ where: { groupId: group.id } });
        await tx.groupOperation.create({ data: { groupId: group.id, operationId: operation.id } });
        await tx.systemLog.create({ data: { userId: res.locals.user?.id, action: "WHATSAPP_SHADOW_GROUP_SELECTED", entity: "WhatsAppGroup", entityId: group.id, message: "Grupo único selecionado para piloto SHADOW.", metadata: { externalId: group.externalId, operationId: operation.id, sendMessage: false, sendReaction: false, officialExcelWrite: false } } });
      });
      res.json({ selected: true, group: { name: group.name, externalId: group.externalId }, operation: operation.name, banner: "GRUPO MONITORADO EM SHADOW", sendMessage: false, sendReaction: false, officialExcelWrite: false });
    } catch (error) { next(error); }
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
      res.json({ ...value, qrDataUrl, sendMessage: false, sendReaction: false, officialExcelWrite: false, mode: "SHADOW", monitoredGroup: selected ? { name: selected.name, maskedExternalId: maskJid(selected.externalId), lastMessage: selected.lastMessage, processedMessages: selected.processedMessages, monitoring: "GRUPO MONITORADO EM SHADOW", operation: selected.operations[0]?.operation.name ?? null } : null });
    } catch (error) { next(error); }
  });
  return router;
}
