import { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { OperationalEvent } from "@coa-bot/shared";
import { OperationalEngine, rebuildProjections } from "../services/operational-engine.js";
import { OperationalWorkflow, WorkflowError } from "../services/operational-workflow.js";
import { MemoryMessageRepository, MemoryPendingRepository, MemoryProjectionRepository, MemoryReportRepository, OperationalPending, SimulatedMessage } from "./operational-contracts.js";

const projectionId = "current";
const draftId = "shift-report";

export class OperationalPrismaContext {
  readonly messages = new MemoryMessageRepository();
  readonly pendings = new MemoryPendingRepository();
  readonly projections = new MemoryProjectionRepository<ReturnType<typeof rebuildProjections>>();
  readonly reports = new MemoryReportRepository();
  readonly engine: OperationalEngine;
  readonly workflow: OperationalWorkflow;

  private constructor(private readonly prisma: PrismaClient, events: OperationalEvent[]) {
    this.engine = new OperationalEngine({ simulationMode: true, seed: events });
    this.workflow = new OperationalWorkflow(this.engine, { messages: this.messages, pendings: this.pendings, projections: this.projections, reports: this.reports });
  }

  static async load(prisma: PrismaClient, seed: Array<Omit<OperationalEvent, "id" | "timestamp" | "simulated"> & { id?: string; timestamp?: string; simulated?: boolean }> = []): Promise<OperationalPrismaContext> {
    let persistedEvents = await prisma.operationalEvent.findMany({ orderBy: { timestamp: "asc" } });
    const missingSeed = seed.filter(event => event.id && !persistedEvents.some(persisted => persisted.id === event.id));
    if (missingSeed.length) {
      const seedContext = new OperationalPrismaContext(prisma, persistedEvents.map(fromEventRow));
      const seeded = new OperationalEngine({ simulationMode: true, seed: missingSeed });
      for (const event of seeded.all()) await seedContext.persistEvent(event);
      persistedEvents = await prisma.operationalEvent.findMany({ orderBy: { timestamp: "asc" } });
    }

    const context = new OperationalPrismaContext(prisma, persistedEvents.map(fromEventRow));

    if (!persistedEvents.length && seed.length) {
      const seeded = new OperationalEngine({ simulationMode: true, seed });
      for (const event of seeded.all()) await context.persistEvent(event);
      return OperationalPrismaContext.load(prisma);
    }

    const [messages, pendings, projection, draft] = await Promise.all([
      prisma.operationalMessage.findMany({ orderBy: { receivedAt: "asc" } }),
      prisma.operationalPending.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.operationalProjection.findUnique({ where: { id: projectionId } }),
      prisma.operationalReportDraft.findUnique({ where: { id: draftId } })
    ]);

    for (const message of messages) context.messages.save({
      id: message.id,
      idempotencyKey: message.idempotencyKey,
      group: message.groupName,
      sender: message.sender,
      receivedAt: message.receivedAt.toISOString(),
      shift: message.shift,
      text: message.text,
      interpretations: message.interpretations as SimulatedMessage["interpretations"],
      status: message.status as SimulatedMessage["status"]
    });

    for (const pending of pendings) context.pendings.save({
      id: pending.id,
      messageId: pending.messageId,
      interpretation: pending.interpretation as OperationalPending["interpretation"],
      baselineStatus: pending.baselineStatus,
      baselineDescription: pending.baselineDescription,
      baselineSector: pending.baselineSector,
      status: pending.status as OperationalPending["status"],
      reason: pending.reason as OperationalPending["reason"],
      createdAt: pending.createdAt.toISOString(),
      resolvedAt: pending.resolvedAt?.toISOString()
    });

    if (projection) context.projections.replace(projection.value as ReturnType<typeof rebuildProjections>);
    if (draft) context.reports.saveDraft(draft.text);
    return context;
  }

  async persistEvent(event: OperationalEvent) {
    try {
      await this.prisma.operationalEvent.create({ data: toEventRow(event) });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
      throw error;
    }
  }

  async persistNewEvents(beforeIds: Set<string>) {
    for (const event of this.engine.all()) if (!beforeIds.has(event.id)) await this.persistEvent(event);
  }

  async persistMessage(message: SimulatedMessage) {
    await this.prisma.operationalMessage.upsert({
      where: { id: message.id },
      create: toMessageRow(message),
      update: toMessageRow(message)
    });
  }

  async persistMessages() {
    for (const message of this.messages.list()) await this.persistMessage(message);
  }

  async persistPending(pending: OperationalPending) {
    await this.prisma.operationalPending.upsert({
      where: { id: pending.id },
      create: toPendingRow(pending),
      update: toPendingRow(pending)
    });
  }

  async persistPendings() {
    for (const pending of this.pendings.list()) await this.persistPending(pending);
  }

  async persistProjection() {
    const value = rebuildProjections(this.engine.all());
    this.projections.replace(value);
    await this.prisma.operationalProjection.upsert({
      where: { id: projectionId },
      create: { id: projectionId, value, version: 1 },
      update: { value, version: { increment: 1 } }
    });
    return value;
  }

  async approvePending(id: string, responsible: string, options: { failAfterEvent?: boolean } = {}) {
    const pending = this.pendings.find(id);
    if (!pending) throw new WorkflowError(404, "Pendência não encontrada.");
    if (pending.status !== "OPEN") throw new WorkflowError(409, "Pendência já resolvida.");
    const fleet = pending.interpretation.mainEquipment!;
    const current = this.engine.currentState(fleet)[0];
    if ((current?.status ?? null) !== pending.baselineStatus || (current?.description ?? null) !== pending.baselineDescription) throw new WorkflowError(409, "Conflito: estado atual mudou após a criação da pendência.");

    const proposed = pending.interpretation.proposedStatus;
    const event: OperationalEvent = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      type: proposed === "PARADO" ? "STOPPED" : pending.baselineStatus === "PARADO" && proposed === "RODANDO" ? "RETURNED" : "STATUS_CHANGED",
      fleet,
      implement: pending.interpretation.attachments.join("/"),
      operation: pending.interpretation.operation ?? current?.operation,
      previousStatus: pending.baselineStatus ?? undefined,
      newStatus: proposed ?? pending.baselineStatus ?? undefined,
      previousDescription: pending.baselineDescription ?? undefined,
      newDescription: pending.interpretation.description ?? undefined,
      previousSector: pending.baselineSector ?? undefined,
      newSector: pending.interpretation.location ?? undefined,
      source: "PANEL",
      originalMessage: pending.interpretation.originalText,
      shift: pending.interpretation.shift ?? "C",
      user: responsible,
      responsible,
      approved: true,
      simulated: true,
      priority: "normal",
      observation: `Situação: ${pending.interpretation.operationalSituation ?? "NORMAL"}`
    };
    const projected = rebuildProjections([...this.engine.all(), event]);

    await this.prisma.$transaction(async tx => {
      const locked = await tx.operationalPending.updateMany({ where: { id, status: "OPEN" }, data: { status: "APPROVED", resolvedAt: new Date() } });
      if (locked.count !== 1) throw new WorkflowError(409, "Pendência já resolvida.");
      await tx.operationalEvent.create({ data: toEventRow(event) });
      if (options.failAfterEvent) throw new Error("Falha simulada após criação de evento.");
      await tx.operationalProjection.upsert({ where: { id: projectionId }, create: { id: projectionId, value: projected, version: 1 }, update: { value: projected, version: { increment: 1 } } });
      await tx.operationalMessage.update({ where: { id: pending.messageId }, data: { status: "PROCESSED" } });
    });

    pending.status = "APPROVED";
    pending.resolvedAt = new Date().toISOString();
    this.pendings.save(pending);
    const message = this.messages.find(pending.messageId);
    if (message) { message.status = "PROCESSED"; this.messages.save(message); }
    this.engine.append(event);
    this.projections.replace(projected);
    return { event, excelCommands: this.engine.toExcelCommands(event), whatsAppCommands: this.engine.toWhatsAppCommands(event), externalActionExecuted: false };
  }

  async rejectPending(id: string, responsible: string, reason = "Rejeitada pelo operador") {
    const pending = this.pendings.find(id);
    if (!pending) throw new WorkflowError(404, "Pendência não encontrada.");
    if (pending.status !== "OPEN") throw new WorkflowError(409, "Pendência já resolvida.");
    const event: OperationalEvent = { id: randomUUID(), timestamp: new Date().toISOString(), type: "CONFIRMED", fleet: pending.interpretation.mainEquipment ?? undefined, operation: pending.interpretation.operation ?? undefined, source: "PANEL", originalMessage: pending.interpretation.originalText, user: responsible, responsible, approved: true, simulated: true, priority: "normal", observation: `Pendência rejeitada: ${reason}` };

    await this.prisma.$transaction(async tx => {
      const locked = await tx.operationalPending.updateMany({ where: { id, status: "OPEN" }, data: { status: "REJECTED", resolvedAt: new Date() } });
      if (locked.count !== 1) throw new WorkflowError(409, "Pendência já resolvida.");
      await tx.operationalEvent.create({ data: toEventRow(event) });
      await tx.operationalMessage.update({ where: { id: pending.messageId }, data: { status: "REJECTED" } });
    });

    pending.status = "REJECTED";
    pending.resolvedAt = new Date().toISOString();
    this.pendings.save(pending);
    const message = this.messages.find(pending.messageId);
    if (message) { message.status = "REJECTED"; this.messages.save(message); }
    this.engine.append(event);
    return { event, externalActionExecuted: false };
  }

  async persistDraft(text: string) {
    await this.prisma.operationalReportDraft.upsert({
      where: { id: draftId },
      create: { id: draftId, text },
      update: { text }
    });
  }
}

function toEventRow(event: OperationalEvent) {
  return {
    id: event.id,
    timestamp: new Date(event.timestamp),
    type: event.type,
    operation: event.operation,
    fleet: event.fleet,
    implement: event.implement,
    groupName: event.group,
    shift: event.shift,
    userName: event.user,
    previousStatus: event.previousStatus,
    newStatus: event.newStatus,
    previousDescription: event.previousDescription,
    newDescription: event.newDescription,
    previousSector: event.previousSector,
    newSector: event.newSector,
    source: event.source,
    originalMessage: event.originalMessage,
    observation: event.observation,
    simulated: event.simulated,
    approved: event.approved,
    responsible: event.responsible,
    priority: event.priority
  };
}

function fromEventRow(row: ReturnType<PrismaClient["operationalEvent"]["findMany"]> extends Promise<Array<infer T>> ? T : never): OperationalEvent {
  return {
    id: row.id,
    timestamp: row.timestamp.toISOString(),
    type: row.type as OperationalEvent["type"],
    operation: row.operation ?? undefined,
    fleet: row.fleet ?? undefined,
    implement: row.implement ?? undefined,
    group: row.groupName ?? undefined,
    shift: row.shift ?? undefined,
    user: row.userName ?? undefined,
    previousStatus: row.previousStatus ?? undefined,
    newStatus: row.newStatus ?? undefined,
    previousDescription: row.previousDescription ?? undefined,
    newDescription: row.newDescription ?? undefined,
    previousSector: row.previousSector ?? undefined,
    newSector: row.newSector ?? undefined,
    source: row.source as OperationalEvent["source"],
    originalMessage: row.originalMessage ?? undefined,
    observation: row.observation ?? undefined,
    simulated: row.simulated,
    approved: row.approved,
    responsible: row.responsible ?? undefined,
    priority: row.priority as OperationalEvent["priority"]
  };
}

function toMessageRow(message: SimulatedMessage) {
  return {
    id: message.id,
    idempotencyKey: message.idempotencyKey,
    groupName: message.group,
    sender: message.sender,
    receivedAt: new Date(message.receivedAt),
    shift: message.shift,
    text: message.text,
    interpretations: message.interpretations,
    status: message.status
  };
}

function toPendingRow(pending: OperationalPending) {
  return {
    id: pending.id,
    messageId: pending.messageId,
    interpretation: pending.interpretation,
    baselineStatus: pending.baselineStatus,
    baselineDescription: pending.baselineDescription,
    baselineSector: pending.baselineSector,
    status: pending.status,
    reason: pending.reason,
    createdAt: new Date(pending.createdAt),
    resolvedAt: pending.resolvedAt ? new Date(pending.resolvedAt) : null
  };
}
