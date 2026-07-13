import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { normalizeOperationalExcelUpdate } from "@coa-bot/excel-contracts";
import { parseMessage } from "../../services/operational-parser/index.js";

const token = process.env.WHATSAPP_SHADOW_TOKEN ?? "local-dev-whatsapp-shadow";
const statusMap: Record<string, string> = { RODANDO: "R", PARADO: "P", DISPONIVEL: "D", MANUTENCAO: "P", SEM_OPERACAO: "E" };

export function whatsappShadowRoutes(prisma = new PrismaClient()) {
  const router = Router();
  router.use((req, res, next) => req.header("x-whatsapp-shadow-token") === token ? next() : res.status(401).json({ message: "Token SHADOW inválido." }));
  router.get("/mode", async (_req, res, next) => {
    try { const setting = await prisma.generalSetting.findUnique({ where: { key: "OPERATIONAL_MODE" } }); res.json({ mode: setting?.value ?? "SIMULATION" }); } catch (error) { next(error); }
  });
  router.post("/status", async (req, res, next) => {
    try {
      await prisma.integrationStatus.upsert({ where: { kind: "WHATSAPP" }, update: { state: req.body.connected ? "ONLINE" : "OFFLINE", message: "WHATSAPP REAL — MODO SOMENTE LEITURA" }, create: { kind: "WHATSAPP", state: req.body.connected ? "ONLINE" : "OFFLINE", message: "WHATSAPP REAL — MODO SOMENTE LEITURA" } });
      res.json({ ok: true, sendMessage: false, sendReaction: false });
    } catch (error) { next(error); }
  });
  router.post("/groups", async (req, res, next) => {
    try {
      for (const group of req.body.groups ?? []) await prisma.whatsAppGroup.upsert({ where: { externalId: group.id }, update: { name: group.name, connectionStatus: "shadow-readonly" }, create: { externalId: group.id, name: group.name, connectionStatus: "shadow-readonly", receivesReports: false } });
      res.json({ ok: true, count: req.body.groups?.length ?? 0 });
    } catch (error) { next(error); }
  });
  router.post("/messages", async (req, res, next) => {
    try {
      const receivedAt = new Date(req.body.receivedAt);
      const originalText = String(req.body.text ?? "");
      const idempotencyKey = createHash("sha256").update(String(req.body.messageId)).digest("hex");
      const existing = await prisma.incomingMessage.findUnique({ where: { idempotencyKey } });
      if (existing) return res.json({ duplicate: true, messageId: existing.id });
      const group = await prisma.whatsAppGroup.upsert({ where: { externalId: req.body.groupId }, update: { lastMessage: originalText, lastActivity: receivedAt, connectionStatus: "shadow-readonly" }, create: { externalId: req.body.groupId, name: req.body.groupName ?? req.body.groupId, lastMessage: originalText, lastActivity: receivedAt, connectionStatus: "shadow-readonly" } });
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
