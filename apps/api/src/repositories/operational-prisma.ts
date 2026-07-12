import { PrismaClient } from "@prisma/client";
import { OperationalEvent } from "@coa-bot/shared";
import { OperationalEngine, rebuildProjections } from "../services/operational-engine.js";
import { OperationalWorkflow } from "../services/operational-workflow.js";
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
    await this.prisma.operationalEvent.upsert({
      where: { id: event.id },
      create: toEventRow(event),
      update: {}
    });
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
      create: { id: projectionId, value },
      update: { value }
    });
    return value;
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
