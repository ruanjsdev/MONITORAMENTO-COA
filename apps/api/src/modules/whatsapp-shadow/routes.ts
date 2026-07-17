import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { normalizeOperationalExcelUpdate } from "@coa-bot/excel-contracts";
import { parseMessages, parseReport } from "../../services/operational-parser/index.js";
import { readRealLocalFleetSnapshot, RealFleetState } from "../local-workbooks/snapshot.js";
import {
  maskJid,
  requireConnectedWhatsApp,
  resolveAuditUserId,
  shadowGroupPersistence,
  shouldCaptureShadowMessage
} from "./group-policy.js";

const token = process.env.WHATSAPP_SHADOW_TOKEN?.trim() ?? "";
const here = path.dirname(fileURLToPath(import.meta.url));
const qrPath =
  process.env.WHATSAPP_QR_PATH ?? path.resolve(here, "../../../../../whatsapp-runtime/qr.png");
const statusMap: Record<string, string> = {
  RODANDO: "R",
  PARADO: "P",
  DISPONIVEL: "D",
  MANUTENCAO: "P",
  SEM_OPERACAO: "E"
};

export function whatsappShadowRoutes(prisma = new PrismaClient()) {
  const router = Router();
  router.use((req, res, next) => {
    if (token.length < 32)
      return res.status(503).json({ message: "WHATSAPP_SHADOW_TOKEN forte não configurado." });
    return req.header("x-whatsapp-shadow-token") === token
      ? next()
      : res.status(401).json({ message: "Token SHADOW inválido." });
  });
  router.get("/mode", async (_req, res, next) => {
    try {
      const setting = await prisma.generalSetting.findUnique({
        where: { key: "OPERATIONAL_MODE" }
      });
      res.json({ mode: setting?.value ?? "SIMULATION" });
    } catch (error) {
      next(error);
    }
  });
  router.get("/selected-group", async (_req, res, next) => {
    try {
      const group = await prisma.whatsAppGroup.findFirst({
        where: { isTestGroup: true, isMonitored: true, isActive: true, active: true }
      });
      res.json({
        externalId: group?.externalId ?? null,
        groupName: group?.name ?? null,
        name: group?.name ?? null
      });
    } catch (error) {
      next(error);
    }
  });
  router.get("/status", async (_req, res, next) => {
    try {
      const setting = await prisma.generalSetting.findUnique({
        where: { key: "WHATSAPP_SHADOW_STATUS" }
      });
      const value = (setting?.value ?? { qrState: "DISCONNECTED" }) as Record<string, unknown>;
      const group = await prisma.whatsAppGroup.findFirst({
        where: { isTestGroup: true, isMonitored: true, isActive: true, active: true }
      });
      res.json({
        qrState: value.qrState ?? "DISCONNECTED",
        sendMessage: false,
        sendReaction: false,
        monitoredGroup: group ? { externalId: group.externalId, name: group.name } : null
      });
    } catch (error) {
      next(error);
    }
  });
  router.get("/refresh-request", async (_req, res, next) => {
    try {
      const setting = await prisma.generalSetting.findUnique({
        where: { key: "WHATSAPP_GROUP_REFRESH" }
      });
      res.json({ version: setting?.version ?? 0 });
    } catch (error) {
      next(error);
    }
  });
  router.post("/status", async (req, res, next) => {
    try {
      const qrState = String(
        req.body.qrState ?? (req.body.connected ? "CONNECTED" : "DISCONNECTED")
      );
      await prisma.integrationStatus.upsert({
        where: { kind: "WHATSAPP" },
        update: {
          state: req.body.connected ? "ONLINE" : "OFFLINE",
          message: `WHATSAPP REAL — MODO SOMENTE LEITURA · ${qrState}`
        },
        create: {
          kind: "WHATSAPP",
          state: req.body.connected ? "ONLINE" : "OFFLINE",
          message: `WHATSAPP REAL — MODO SOMENTE LEITURA · ${qrState}`
        }
      });
      await prisma.generalSetting.upsert({
        where: { key: "WHATSAPP_SHADOW_STATUS" },
        update: {
          value: { qrState, updatedAt: new Date().toISOString(), ...req.body },
          version: { increment: 1 }
        },
        create: {
          key: "WHATSAPP_SHADOW_STATUS",
          value: { qrState, updatedAt: new Date().toISOString(), ...req.body }
        }
      });
      res.json({ ok: true, sendMessage: false, sendReaction: false });
    } catch (error) {
      next(error);
    }
  });
  router.post("/groups", async (req, res, next) => {
    try {
      const syncedAt = new Date();
      for (const group of req.body.groups ?? [])
        await prisma.whatsAppGroup.upsert({
          where: { externalId: group.id },
          update: {
            name: group.name,
            participantCount: group.participantCount ?? 0,
            whatsappUpdatedAt: syncedAt,
            connectionStatus: "shadow-readonly"
          },
          create: {
            externalId: group.id,
            name: group.name,
            participantCount: group.participantCount ?? 0,
            whatsappUpdatedAt: syncedAt,
            connectionStatus: "shadow-readonly",
            receivesReports: false,
            isMonitored: false,
            isTestGroup: false
          }
        });
      res.json({ ok: true, count: req.body.groups?.length ?? 0 });
    } catch (error) {
      next(error);
    }
  });
  router.post("/ignored", async (req, res, next) => {
    try {
      await prisma.systemLog.create({
        data: {
          action: "WHATSAPP_SHADOW_MESSAGE_IGNORED",
          message: "Mensagem ignorada por pertencer a grupo não monitorado.",
          metadata: {
            groupJid: req.body.groupId,
            messageId: req.body.messageId,
            source: "WHATSAPP_SHADOW"
          },
          result: "IGNORED"
        }
      });
      res.json({ ignored: true });
    } catch (error) {
      next(error);
    }
  });
  router.post("/messages", async (req, res, next) => {
    try {
      const receivedAt = new Date(req.body.receivedAt);
      const originalText = String(req.body.text ?? "");
      const selected = await prisma.whatsAppGroup.findFirst({
        where: {
          externalId: req.body.groupId,
          isTestGroup: true,
          isMonitored: true,
          isActive: true,
          active: true
        }
      });
      if (!selected || !shouldCaptureShadowMessage(selected.externalId, String(req.body.groupId)))
        return res.status(202).json({ ignored: true, reason: "GROUP_NOT_SELECTED" });
      const idempotencyKey = createHash("sha256")
        .update(`${req.body.groupId}:${req.body.messageId}`)
        .digest("hex");
      const existing = await prisma.incomingMessage.findUnique({ where: { idempotencyKey } });
      if (existing) {
        await prisma.systemLog.create({
          data: {
            action: "WHATSAPP_SHADOW_MESSAGE_DUPLICATE",
            entity: "IncomingMessage",
            entityId: existing.id,
            message: "Mensagem duplicada ignorada.",
            metadata: { groupJid: req.body.groupId, messageId: req.body.messageId },
            result: "DUPLICATE"
          }
        });
        return res.json({ duplicate: true, messageId: existing.id });
      }
      const group = await prisma.whatsAppGroup.update({
        where: { id: selected.id },
        data: {
          lastMessage: originalText,
          lastActivity: receivedAt,
          processedMessages: { increment: 1 },
          connectionStatus: "shadow-readonly"
        }
      });
      const message = await prisma.incomingMessage.create({
        data: {
          idempotencyKey,
          groupId: group.id,
          sender: req.body.sender ?? "desconhecido",
          content: originalText,
          receivedAt
        }
      });
      const result = await processShadowMessage(prisma, message.id);
      res.status(201).json({ messageId: message.id, ...result, externalActions: false });
    } catch (error) {
      next(error);
    }
  });
  return router;
}

export function whatsappShadowPanelRoutes(prisma = new PrismaClient()) {
  const router = Router();
  router.get("/groups", async (req, res, next) => {
    try {
      const query = String(req.query.q ?? "").trim();
      const groups = await prisma.whatsAppGroup.findMany({
        where: {
          externalId: { not: null },
          connectionStatus: "shadow-readonly",
          ...(query ? { name: { contains: query, mode: "insensitive" } } : {})
        },
        include: { operations: { include: { operation: true } } },
        orderBy: { name: "asc" }
      });
      res.json(
        groups.map((group) => ({
          id: group.id,
          externalId: group.externalId,
          maskedExternalId: maskJid(group.externalId),
          name: group.name,
          participantCount: group.participantCount,
          whatsappUpdatedAt: group.whatsappUpdatedAt,
          selected: group.isTestGroup,
          monitored: group.isMonitored,
          operation: group.operations[0]?.operation
            ? { id: group.operations[0].operation.id, name: group.operations[0].operation.name }
            : null
        }))
      );
    } catch (error) {
      next(error);
    }
  });
  router.post("/groups/refresh", async (_req, res, next) => {
    try {
      const connection = await prisma.integrationStatus.findUnique({ where: { kind: "WHATSAPP" } });
      try {
        requireConnectedWhatsApp(connection?.state);
      } catch {
        return res
          .status(409)
          .json({ message: "WhatsApp desconectado; não é possível atualizar grupos." });
      }
      const request = await prisma.generalSetting.upsert({
        where: { key: "WHATSAPP_GROUP_REFRESH" },
        update: { value: { requestedAt: new Date().toISOString() }, version: { increment: 1 } },
        create: { key: "WHATSAPP_GROUP_REFRESH", value: { requestedAt: new Date().toISOString() } }
      });
      res.status(202).json({ requested: true, version: request.version });
    } catch (error) {
      next(error);
    }
  });
  router.post("/groups/select", async (req, res, next) => {
    try {
      const connection = await prisma.integrationStatus.findUnique({ where: { kind: "WHATSAPP" } });
      try {
        requireConnectedWhatsApp(connection?.state);
      } catch {
        return res.status(409).json({ message: "Conecte o WhatsApp antes de selecionar o grupo." });
      }
      const group = await prisma.whatsAppGroup.findUnique({
        where: { externalId: String(req.body.externalId) }
      });
      const operation = await prisma.operation.findUnique({
        where: { id: String(req.body.operationId) }
      });
      if (!group || !operation)
        return res.status(404).json({ message: "Grupo ou operação não encontrado." });
      const actorId = await resolveAuditUserId(prisma, res.locals.user?.email);
      await prisma.$transaction(async (tx) => {
        await tx.whatsAppGroup.updateMany({
          where: { isTestGroup: true },
          data: { isTestGroup: false, isMonitored: false }
        });
        await tx.whatsAppGroup.update({
          where: { id: group.id },
          data: {
            name: group.name,
            ...shadowGroupPersistence(String(group.externalId)),
            version: { increment: 1 },
            updatedBy: actorId
          }
        });
        await tx.groupOperation.deleteMany({ where: { groupId: group.id } });
        await tx.groupOperation.create({ data: { groupId: group.id, operationId: operation.id } });
        await tx.systemLog.create({
          data: {
            userId: actorId,
            action: "WHATSAPP_SHADOW_GROUP_SELECTED",
            entity: "WhatsAppGroup",
            entityId: group.id,
            message: "Grupo selecionado para monitoramento.",
            metadata: {
              externalId: group.externalId,
              operationId: operation.id,
              sendMessage: false,
              sendReaction: false,
              officialExcelWrite: false
            }
          }
        });
      });
      res.json({
        selected: true,
        group: { name: group.name, externalId: group.externalId },
        operation: operation.name,
        banner: "GRUPO MONITORADO",
        sendMessage: false,
        sendReaction: false,
        officialExcelWrite: false
      });
    } catch (error) {
      next(error);
    }
  });
  router.post("/messages/:id/reprocess", async (req, res, next) => {
    try {
      res.json(await processShadowMessage(prisma, String(req.params.id)));
    } catch (error) {
      next(error);
    }
  });
  router.get("/status", async (_req, res, next) => {
    try {
      const setting = await prisma.generalSetting.findUnique({
        where: { key: "WHATSAPP_SHADOW_STATUS" }
      });
      const value = (setting?.value ?? { qrState: "DISCONNECTED" }) as Record<string, unknown>;
      let qrDataUrl: string | null = null;
      if (value.qrState === "QR_VALID") {
        try {
          qrDataUrl = `data:image/png;base64,${(await readFile(qrPath)).toString("base64")}`;
        } catch {
          value.qrState = "QR_EXPIRED";
        }
      }
      res.setHeader("Cache-Control", "no-store");
      const selected = await prisma.whatsAppGroup.findFirst({
        where: { isTestGroup: true, isMonitored: true, isActive: true, active: true },
        include: { operations: { include: { operation: true } } }
      });
      const [lastMessage, lastParsed, lastPending, ignored, duplicates, processed] =
        await Promise.all([
          prisma.incomingMessage.findFirst({
            where: { groupId: selected?.id },
            orderBy: { receivedAt: "desc" }
          }),
          prisma.parsedMessage.findFirst({
            where: { incomingMessage: { groupId: selected?.id } },
            orderBy: { id: "desc" }
          }),
          prisma.pendingChange.findFirst({
            where: { incomingMessage: { groupId: selected?.id }, createdBy: "WHATSAPP_SHADOW" },
            orderBy: { createdAt: "desc" }
          }),
          prisma.systemLog.count({ where: { action: "WHATSAPP_SHADOW_MESSAGE_IGNORED" } }),
          prisma.systemLog.count({ where: { action: "WHATSAPP_SHADOW_MESSAGE_DUPLICATE" } }),
          prisma.systemLog.count({
            where: { action: "WHATSAPP_SHADOW_MESSAGE_PROCESSED", result: "SUCCESS" }
          })
        ]);
      res.json({
        ...value,
        qrDataUrl,
        sendMessage: false,
        sendReaction: false,
        officialExcelWrite: false,
        mode: "READ_ONLY",
        source: "WHATSAPP_REAL",
        monitoredGroup: selected
          ? {
              name: selected.name,
              maskedExternalId: maskJid(selected.externalId),
              lastMessage: selected.lastMessage,
              processedMessages: selected.processedMessages,
              monitoring: "MONITORAMENTO ATIVO",
              operation: selected.operations[0]?.operation.name ?? null
            }
          : null,
        pipeline: {
          lastMessageId: lastMessage?.id ?? null,
          lastPersistedMessage: lastMessage?.content ?? null,
          lastInterpretation: lastParsed?.parsedJson ?? null,
          lastPendingId: lastPending?.id ?? null,
          captured: selected?.processedMessages ?? 0,
          processed,
          ignored,
          duplicates,
          lastError: null
        }
      });
    } catch (error) {
      next(error);
    }
  });
  return router;
}

export async function processShadowMessage(prisma: PrismaClient, messageId: string) {
  const message = await prisma.incomingMessage.findUniqueOrThrow({
    where: { id: messageId },
    include: { group: { include: { operations: { include: { operation: true } } } } }
  });
  const correlationId = randomUUID();
  const report = parseReport(message.content);
  const items = report.items.length ? report.items : parseMessages(message.content);
  const groupOperation = message.group?.operations[0]?.operation ?? null;
  const [snapshot, activeOperations] = await Promise.all([
    readRealLocalFleetSnapshot(prisma).catch(() => undefined),
    prisma.operation.findMany({ where: { active: true } })
  ]);
  const operationByName = new Map(activeOperations.map((item) => [item.name, item]));
  const results = [];
  for (const parsed of items) {
    const excelMatches =
      snapshot?.fleets.filter((item) => item.fleet === parsed.mainEquipment) ?? [];
    const resolution = resolveOperationForFleet({
      explicitOperation: parsed.operation,
      fleet: parsed.mainEquipment,
      excelFleets: snapshot?.fleets ?? [],
      groupOperation: groupOperation?.name ?? null
    });
    const operation = resolution.operation
      ? (operationByName.get(resolution.operation) ?? null)
      : null;
    const excelFleet = operation
      ? excelMatches.find((item) => item.operation === operation.name)
      : undefined;
    const excelValidation = validateFleetAgainstExcel({
      snapshotAvailable: Boolean(snapshot),
      matches: excelMatches,
      selected: excelFleet,
      operation: operation?.name ?? null,
      informedImplements: parsed.attachments
    });
    const statusResolution = resolveExcelStatus(parsed, excelFleet);
    const status = statusResolution.status;
    const description = normalizeDescription(parsed.description, status);
    const normalized = normalizeOperationalExcelUpdate({
      status,
      description,
      receivedAt: message.receivedAt,
      forecastAt: parsed.forecastAt,
      forecastInformed: Boolean(parsed.forecastAt)
    });
    const changeDetection = detectOperationalChange(normalized, excelFleet, parsed.forecastAt);
    const metadata = {
      ...parsed,
      operation: operation?.name ?? null,
      operationResolution: resolution.source,
      statusResolution: statusResolution.source,
      excelValidation,
      currentExcelState: excelFleet ?? null,
      normalized,
      changeDetection,
      source: "WHATSAPP_SHADOW",
      simulated: false,
      correlationId,
      groupJid: message.group?.externalId,
      rulesApplied: normalized.reasons,
      candidateCells: candidateCells(operation, parsed.mainEquipment)
    };
    const existingParsed = await prisma.parsedMessage.findFirst({
      where: {
        incomingMessageId: message.id,
        parsedJson: { path: ["mainEquipment"], equals: parsed.mainEquipment ?? "__NONE__" }
      }
    });
    if (existingParsed)
      await prisma.parsedMessage.update({
        where: { id: existingParsed.id },
        data: { confidence: parsed.confidence, parsedJson: metadata }
      });
    else
      await prisma.parsedMessage.create({
        data: { incomingMessageId: message.id, confidence: parsed.confidence, parsedJson: metadata }
      });
    let pending = null;
    if (
      parsed.mainEquipment &&
      normalized.valid &&
      operation &&
      excelValidation.state === "MATCH" &&
      changeDetection.changed
    ) {
      const pendingKey = {
        incomingMessageId: message.id,
        equipmentCode: parsed.mainEquipment,
        createdBy: "WHATSAPP_SHADOW"
      };
      const existing = await prisma.pendingChange.findUnique({
        where: { incomingMessageId_equipmentCode_createdBy: pendingKey }
      });
      const data = {
        operationId: operation?.id,
        currentStatus: currentExcelStatus(excelFleet) ?? existing?.currentStatus ?? "DESCONHECIDO",
        newStatus: normalized.status,
        description: normalized.description,
        confidence: parsed.confidence,
        status: "PENDING" as const,
        active: true,
        createdBy: "WHATSAPP_SHADOW",
        updatedBy: null
      };
      const unchangedApproved =
        existing &&
        !existing.active &&
        existing.operationId === data.operationId &&
        existing.newStatus === data.newStatus &&
        existing.description === data.description;
      pending = unchangedApproved
        ? existing
        : existing
          ? await prisma.pendingChange.update({
              where: { id: existing.id },
              data: { ...data, version: { increment: 1 } }
            })
          : await prisma.pendingChange.upsert({
              where: { incomingMessageId_equipmentCode_createdBy: pendingKey },
              update: { ...data, version: { increment: 1 } },
              create: {
                ...data,
                incomingMessageId: message.id,
                equipmentCode: parsed.mainEquipment
              }
            });
    }
    const disposition = pending
      ? "PENDING_CREATED"
      : !normalized.valid
        ? "INVALID_OPERATIONAL_DATA"
        : excelValidation.state !== "MATCH"
          ? excelValidation.state
          : !changeDetection.changed
            ? "NO_CHANGE"
            : "VALIDATION_REQUIRED";
    results.push({ parsed: metadata, pendingId: pending?.id ?? null, disposition });
  }
  await prisma.systemLog.create({
    data: {
      action: "WHATSAPP_SHADOW_MESSAGE_PROCESSED",
      entity: "IncomingMessage",
      entityId: message.id,
      message: "Mensagem real processada no pipeline operacional SHADOW.",
      metadata: {
        correlationId,
        source: "WHATSAPP_SHADOW",
        simulated: false,
        itemCount: results.length,
        pendingIds: results.map((item) => item.pendingId),
        reportHeader: report.header,
        inventoryItems: report.inventoryItems,
        ignoredLines: report.ignoredLines,
        sendMessage: false,
        sendReaction: false,
        officialExcelWrite: false
      },
      result: results.every((item) => item.pendingId || item.disposition === "NO_CHANGE")
        ? "SUCCESS"
        : "VALIDATION_REQUIRED"
    }
  });
  return {
    correlationId,
    source: "WHATSAPP_SHADOW",
    simulated: false,
    items: results,
    pendingIds: results.map((item) => item.pendingId).filter(Boolean),
    externalActions: { sendMessage: false, sendReaction: false, officialExcelWrite: false }
  };
}

export function resolveOperationForFleet(input: {
  explicitOperation: string | null;
  fleet: string | null;
  excelFleets: Array<{ fleet: string; operation: string }>;
  groupOperation: string | null;
}) {
  if (input.explicitOperation)
    return { operation: input.explicitOperation, source: "MESSAGE" as const };

  const excelOperations = [
    ...new Set(
      input.excelFleets.filter((item) => item.fleet === input.fleet).map((item) => item.operation)
    )
  ];
  if (excelOperations.length === 1)
    return { operation: excelOperations[0], source: "EXCEL" as const };
  if (input.groupOperation && excelOperations.includes(input.groupOperation))
    return { operation: input.groupOperation, source: "GROUP_MATCHED_IN_EXCEL" as const };
  return { operation: input.groupOperation, source: "GROUP_FALLBACK" as const };
}

function normalizeDescription(value: string | null, status?: string) {
  if (status === "R") return "RODANDO";
  const withoutStatus = String(value ?? "")
    .replace(/^parad[oa],?\s*/i, "")
    .trim();
  const withoutForecast = withoutStatus.replace(/,?\s*previs[aã]o.+$/i, "").trim();
  return (withoutForecast || withoutStatus).toUpperCase();
}

export function validateFleetAgainstExcel(input: {
  snapshotAvailable: boolean;
  matches: RealFleetState[];
  selected?: RealFleetState;
  operation: string | null;
  informedImplements: string[];
}) {
  if (!input.snapshotAvailable)
    return { state: "EXCEL_UNAVAILABLE" as const, blockers: ["EXCEL_SNAPSHOT_UNAVAILABLE"] };
  if (!input.matches.length)
    return { state: "FLEET_NOT_FOUND" as const, blockers: ["FLEET_NOT_FOUND_IN_EXCEL"] };
  if (!input.selected)
    return {
      state: "OPERATION_MISMATCH" as const,
      blockers: ["FLEET_NOT_FOUND_IN_REPORT_OPERATION"],
      excelOperations: [...new Set(input.matches.map((item) => item.operation))],
      reportOperation: input.operation
    };
  const actualImplements: string[] = input.selected.implement?.match(/\d{3,6}/g) ?? [];
  const implementMismatch =
    input.informedImplements.length > 0 &&
    input.informedImplements.some((item) => !actualImplements.includes(item));
  return {
    state: "MATCH" as const,
    blockers: [],
    implementMismatch,
    informedImplements: input.informedImplements,
    excelImplement: input.selected.implement
  };
}

export function resolveExcelStatus(
  parsed: { proposedStatus: string | null; operationalSituation: string | null },
  fleet?: Pick<RealFleetState, "status">
) {
  if (parsed.proposedStatus)
    return { status: statusMap[parsed.proposedStatus], source: "MESSAGE" as const };
  if (parsed.operationalSituation) {
    const status = currentExcelStatus(fleet);
    if (status) return { status, source: "EXCEL_CURRENT_STATUS_PRESERVED" as const };
  }
  return { status: undefined, source: "UNRESOLVED" as const };
}

export function detectOperationalChange(
  proposed: ReturnType<typeof normalizeOperationalExcelUpdate>,
  current?: Pick<RealFleetState, "status" | "description">,
  forecastAt?: string | null
) {
  if (!current) return { changed: true, reasons: ["CURRENT_EXCEL_STATE_UNAVAILABLE"] };
  const reasons: string[] = [];
  if (proposed.status !== currentExcelStatus(current)) reasons.push("STATUS_CHANGED");
  if (comparableText(proposed.description) !== comparableText(current.description))
    reasons.push("DESCRIPTION_CHANGED");
  if (forecastAt) reasons.push("FORECAST_INFORMED");
  return { changed: reasons.length > 0, reasons };
}

function currentExcelStatus(fleet?: Pick<RealFleetState, "status">) {
  const status = fleet?.status.trim().toUpperCase();
  if (status === "R" || status === "RODANDO") return "R";
  if (status === "P" || status === "PARADO" || status === "MANUTENCAO") return "P";
  if (status === "D" || status === "DISPONIVEL") return "D";
  if (status === "E" || status === "SEM_OPERACAO") return "E";
  return undefined;
}

function comparableText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function candidateCells(
  operation: {
    fleetColumn: string | null;
    implementColumn: string | null;
    statusColumn: string | null;
    descriptionColumn: string | null;
    timeColumn: string | null;
  } | null,
  fleet: string | null
) {
  return {
    fleet,
    fleetColumn: operation?.fleetColumn,
    implementColumn: operation?.implementColumn,
    statusColumn: operation?.statusColumn,
    descriptionColumn: operation?.descriptionColumn,
    timeColumn: operation?.timeColumn,
    officialExcelWrite: false
  };
}
