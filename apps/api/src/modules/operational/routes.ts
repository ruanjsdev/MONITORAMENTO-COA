import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { OperationalEvent, OperationalEventType } from "@coa-bot/shared";
import {
  operationalDecisionSchema,
  operationalParseSchema,
  operationalSimulateSchema
} from "@coa-bot/validation";
import { HttpError } from "../../errors/http-error.js";
import { assertDatabaseConfiguration, resolveDatabaseMode } from "../../config/database-mode.js";
import { OperationalPrismaContext } from "../../repositories/operational-prisma.js";
import { OperationalEngine } from "../../services/operational-engine.js";
import { OperationalWorkflow, WorkflowError } from "../../services/operational-workflow.js";
import { readRealLocalFleetSnapshot } from "../local-workbooks/snapshot.js";

type OperationalContext = OperationalPrismaContext | MemoryOperationalContext;

class MemoryOperationalContext {
  readonly engine: OperationalEngine;
  readonly workflow: OperationalWorkflow;
  constructor(seed: DemoEvent[]) {
    this.engine = new OperationalEngine({ simulationMode: true, seed });
    this.workflow = new OperationalWorkflow(this.engine);
  }
  async persistEvent() {}
  async persistNewEvents(_beforeIds?: Set<string>) {}
  async persistMessages() {}
  async persistPendings() {}
  async persistProjection() {
    return this.workflow.rebuild();
  }
  async persistDraft() {}
}

type DemoEvent = Omit<OperationalEvent, "id" | "timestamp" | "simulated"> & {
  id?: string;
  timestamp?: string;
  simulated?: boolean;
};

export function operationalRoutes(prisma = new PrismaClient()) {
  const router = Router();
  const seed = process.env.NODE_ENV === "test" ? demoSeed() : [];
  let contextPromise: Promise<OperationalContext> | undefined;

  async function context() {
    if (!contextPromise) {
      const mode = resolveDatabaseMode();
      if (mode === "prisma") assertDatabaseConfiguration();
      contextPromise =
        mode === "prisma"
          ? OperationalPrismaContext.load(prisma, seed)
          : Promise.resolve(new MemoryOperationalContext(seed));
    }
    return contextPromise;
  }

  router.get("/snapshot", async (_req, res, next) => {
    try {
      const ctx = await context();
      const setting = await prisma.generalSetting.findUnique({
        where: { key: "OPERATIONAL_MODE" }
      });
      const localOperational =
        setting?.value === "LOCAL_OPERATIONAL" && process.env.NODE_ENV !== "test";
      const realSnapshot = localOperational ? await readRealLocalFleetSnapshot(prisma) : undefined;
      const fleets = realSnapshot?.fleets ?? ctx.engine.currentState();
      const [realMessages, realPendencies, integrations] = localOperational
        ? await Promise.all([
            prisma.incomingMessage.findMany({
              where: { group: { isMonitored: true } },
              include: { group: true, pendingChanges: { include: { operation: true } } },
              orderBy: { receivedAt: "desc" },
              take: 20
            }),
            prisma.pendingChange.findMany({
              where: { active: true, status: "PENDING" },
              include: { operation: true },
              orderBy: { createdAt: "desc" }
            }),
            prisma.integrationStatus.findMany()
          ])
        : [[], [], []];
      const grouped = Object.values(
        fleets.reduce<
          Record<
            string,
            { operation: string; machines: number; stopped: number; updatedAt: string }
          >
        >((acc, item) => {
          const row = (acc[item.operation] ??= {
            operation: item.operation,
            machines: 0,
            stopped: 0,
            updatedAt: item.updatedAt
          });
          row.machines++;
          if (item.status === "PARADO") row.stopped++;
          if (item.updatedAt > row.updatedAt) row.updatedAt = item.updatedAt;
          return acc;
        }, {})
      );
      const messages = localOperational
        ? realMessages.map((message) => ({
            id: message.id,
            text: message.content,
            sender: message.sender,
            group: message.group?.name,
            operation: message.pendingChanges[0]?.operation?.name,
            status: message.pendingChanges.some((item) => item.active && item.status === "PENDING")
              ? "PENDING_APPROVAL"
              : "PROCESSED",
            receivedAt: message.receivedAt.toISOString()
          }))
        : ctx.workflow.messages
            .list()
            .map((message) => ({
              id: message.id,
              text: message.text,
              sender: message.sender,
              group: message.group,
              operation: message.interpretations[0]?.operation,
              status: message.status === "PENDING" ? "PENDING_APPROVAL" : message.status,
              receivedAt: message.receivedAt
            }));
      const eventMessages = ctx.engine
        .timeline()
        .filter((event) => event.type === "MESSAGE_RECEIVED" || event.type === "ERROR")
        .map((event) => ({
          id: event.id,
          text: event.originalMessage ?? event.observation,
          sender: event.user,
          group: event.group,
          operation: event.operation,
          status: event.type === "ERROR" ? "FAILED" : "PENDING_APPROVAL",
          receivedAt: event.timestamp
        }));
      const pendencies = localOperational
        ? realPendencies.map((item) => ({
            id: item.id,
            operation: item.operation?.name ?? "Não informada",
            subject: `Frota ${item.equipmentCode}`,
            reason: item.description,
            since: item.createdAt.toISOString(),
            priority: item.confidence < 0.6 ? "urgent" : "high",
            status: "open"
          }))
        : pendingSummary(ctx);
      const integrationStates = Object.fromEntries(
        integrations.map((item) => [item.kind, item.state])
      );
      res.json({
        simulationMode: !localOperational,
        source: realSnapshot?.source ?? "OPERATIONAL_PROJECTION",
        readAt: realSnapshot?.readAt,
        unavailableSheets: realSnapshot?.unavailableSheets ?? [],
        shift: "C",
        shiftEndsAt: new Date(Date.now() + 3_600_000).toISOString(),
        fleets,
        messages: localOperational ? messages : [...messages, ...eventMessages],
        pendencies,
        systems: systemStatus(resolveDatabaseMode(), ctx, localOperational, integrationStates),
        operations: grouped.map(
          (item) => `${item.operation}: ${item.machines} máquinas · ${item.stopped} paradas`
        ),
        operationSummary: grouped,
        timeline: ctx.engine
          .timeline()
          .filter((event) => !localOperational || !event.simulated)
          .slice(0, 12),
        nextReport: "21:45 · Plantio",
        shiftReportStatus: "Aguardando revisão"
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/timeline", async (req, res, next) => {
    try {
      const ctx = await context();
      res.json(
        ctx.engine.timeline({
          since: req.query.since as string | undefined,
          operation: req.query.operation as string | undefined,
          fleet: req.query.fleet as string | undefined,
          shift: req.query.shift as string | undefined,
          group: req.query.group as string | undefined
        })
      );
    } catch (error) {
      next(error);
    }
  });
  router.post("/messages/parse", async (req, res, next) => {
    try {
      const ctx = await context();
      const input = operationalParseSchema.safeParse(req.body);
      if (!input.success) throw new HttpError(400, "Mensagem inválida.", input.error.issues);
      res.json(ctx.workflow.parse(input.data.text, input.data));
    } catch (error) {
      next(error);
    }
  });
  router.post("/messages/simulate", async (req, res, next) => {
    try {
      const ctx = await context();
      const input = operationalSimulateSchema.safeParse(req.body);
      if (!input.success) throw new HttpError(400, "Mensagem inválida.", input.error.issues);
      const before = eventIds(ctx);
      const message = ctx.workflow.simulate(input.data);
      await ctx.persistMessages();
      await ctx.persistNewEvents(before);
      await ctx.persistProjection();
      res.status(201).json(message);
    } catch (error) {
      handleWorkflow(error, res, next);
    }
  });
  router.get("/messages", async (_req, res, next) => {
    try {
      const ctx = await context();
      res.json(ctx.workflow.messages.list());
    } catch (error) {
      next(error);
    }
  });
  router.get("/messages/:id", async (req, res, next) => {
    try {
      const ctx = await context();
      const item = ctx.workflow.messages.find(String(req.params.id));
      if (!item) throw new HttpError(404, "Mensagem não encontrada.");
      res.json(item);
    } catch (error) {
      next(error);
    }
  });
  router.post("/messages/:id/create-pending-change", async (req, res, next) => {
    try {
      const ctx = await context();
      const before = eventIds(ctx);
      const created = ctx.workflow.createPendings(String(req.params.id));
      await ctx.persistMessages();
      await ctx.persistPendings();
      await ctx.persistNewEvents(before);
      await ctx.persistProjection();
      res.status(201).json(created);
    } catch (error) {
      handleWorkflow(error, res, next);
    }
  });
  router.get("/events", async (_req, res, next) => {
    try {
      const ctx = await context();
      res.json(ctx.engine.timeline());
    } catch (error) {
      next(error);
    }
  });
  router.get("/equipment/:fleet/history", async (req, res, next) => {
    try {
      const ctx = await context();
      res.json(ctx.engine.fleetHistory(String(req.params.fleet)));
    } catch (error) {
      next(error);
    }
  });
  router.get("/equipment/:fleet/current-state", async (req, res, next) => {
    try {
      const ctx = await context();
      res.json(ctx.engine.currentState(String(req.params.fleet))[0] ?? null);
    } catch (error) {
      next(error);
    }
  });
  router.get("/equipment/:fleet/downtime", async (req, res, next) => {
    try {
      const ctx = await context();
      res.json(ctx.engine.stopMetrics(String(req.params.fleet)));
    } catch (error) {
      next(error);
    }
  });
  router.get("/pending", async (_req, res, next) => {
    try {
      const ctx = await context();
      res.json(ctx.workflow.pendings.list());
    } catch (error) {
      next(error);
    }
  });
  router.post("/pending/:id/approve", async (req, res, next) => {
    try {
      const ctx = await context();
      const input = operationalDecisionSchema.parse(req.body);
      const before = eventIds(ctx);
      const result =
        ctx instanceof OperationalPrismaContext
          ? await ctx.approvePending(String(req.params.id), input.responsible)
          : ctx.workflow.approve(String(req.params.id), input.responsible);
      if (!(ctx instanceof OperationalPrismaContext)) {
        const memory = ctx as MemoryOperationalContext;
        await ctx.persistPendings();
        await memory.persistNewEvents(before);
        await ctx.persistProjection();
      }
      res.json(result);
    } catch (error) {
      handleWorkflow(error, res, next);
    }
  });
  router.post("/pending/:id/reject", async (req, res, next) => {
    try {
      const ctx = await context();
      const input = operationalDecisionSchema.parse(req.body);
      const before = eventIds(ctx);
      const result =
        ctx instanceof OperationalPrismaContext
          ? await ctx.rejectPending(String(req.params.id), input.responsible, input.reason)
          : ctx.workflow.reject(String(req.params.id), input.responsible, input.reason);
      if (!(ctx instanceof OperationalPrismaContext)) {
        const memory = ctx as MemoryOperationalContext;
        await ctx.persistPendings();
        await memory.persistNewEvents(before);
        await ctx.persistProjection();
      }
      res.json(result);
    } catch (error) {
      handleWorkflow(error, res, next);
    }
  });
  router.post("/projections/rebuild", async (_req, res, next) => {
    try {
      const ctx = await context();
      res.json(await ctx.persistProjection());
    } catch (error) {
      next(error);
    }
  });
  router.get("/shift-report/draft", async (_req, res, next) => {
    try {
      const ctx = await context();
      const draft = ctx.workflow.shiftDraft();
      await ctx.persistDraft(draft.text);
      res.json(draft);
    } catch (error) {
      next(error);
    }
  });
  router.get("/fleets/:fleet", async (req, res, next) => {
    try {
      const ctx = await context();
      res.json(ctx.engine.fleetHistory(String(req.params.fleet)));
    } catch (error) {
      next(error);
    }
  });
  router.get("/shift-journal", async (req, res, next) => {
    try {
      const ctx = await context();
      res.json(ctx.engine.shiftJournal(String(req.query.shift ?? "C")));
    } catch (error) {
      next(error);
    }
  });
  router.get("/search", async (req, res, next) => {
    try {
      const ctx = await context();
      res.json(ctx.engine.search(String(req.query.q ?? "")));
    } catch (error) {
      next(error);
    }
  });
  router.post("/events", async (req, res, next) => {
    try {
      const ctx = await context();
      const event = ctx.engine.append({
        ...req.body,
        type: req.body.type as OperationalEventType,
        source: "PANEL",
        approved: Boolean(req.body.approved),
        priority: req.body.priority ?? "normal",
        responsible: res.locals.user?.name ?? "Operador",
        user: res.locals.user?.name ?? "Operador"
      });
      await ctx.persistEvent(event);
      await ctx.persistProjection();
      res
        .status(201)
        .json({
          event,
          excelCommands: ctx.engine.toExcelCommands(event),
          whatsAppCommands: ctx.engine.toWhatsAppCommands(event),
          externalActionExecuted: false
        });
    } catch (error) {
      next(error);
    }
  });
  router.post("/pendencies/:id/action", async (req, res, next) => {
    try {
      const ctx = await context();
      const item = ctx.workflow.pendings.find(String(req.params.id));
      const before = eventIds(ctx);
      let result: unknown;
      if (item && req.body.action === "approve")
        result =
          ctx instanceof OperationalPrismaContext
            ? await ctx.approvePending(item.id, res.locals.user?.name ?? "Operador")
            : ctx.workflow.approve(item.id, res.locals.user?.name ?? "Operador");
      else if (item && ["reject", "resolve", "duplicate"].includes(String(req.body.action)))
        result =
          ctx instanceof OperationalPrismaContext
            ? await ctx.rejectPending(
                item.id,
                res.locals.user?.name ?? "Operador",
                String(req.body.action)
              )
            : ctx.workflow.reject(
                item.id,
                res.locals.user?.name ?? "Operador",
                String(req.body.action)
              );
      else if (String(req.params.id).startsWith("pen-")) {
        const item = pendingSummary(ctx).find((candidate) => candidate.id === req.params.id) ?? {
          id: req.params.id,
          status: "open"
        };
        item.status = "resolved";
        const event = ctx.engine.append({
          type: req.body.action === "approve" ? "PENDING_APPROVED" : "CONFIRMED",
          source: "PANEL",
          approved: true,
          priority: "normal",
          observation: `Pendência ${req.body.action}`,
          responsible: res.locals.user?.name ?? "Operador",
          user: res.locals.user?.name ?? "Operador"
        });
        result = {
          simulated: true,
          externalActionExecuted: false,
          item,
          event,
          action: req.body.action
        };
      } else {
        const event = ctx.engine.append({
          type: req.body.action === "approve" ? "PENDING_APPROVED" : "CONFIRMED",
          source: "PANEL",
          approved: true,
          priority: "normal",
          observation: `Pendência ${req.body.action}`,
          responsible: res.locals.user?.name ?? "Operador",
          user: res.locals.user?.name ?? "Operador"
        });
        result = { simulated: true, externalActionExecuted: false, event, action: req.body.action };
      }
      if (!(ctx instanceof OperationalPrismaContext)) {
        const memory = ctx as MemoryOperationalContext;
        await ctx.persistPendings();
        await memory.persistNewEvents(before);
        await ctx.persistProjection();
      }
      res.json(result);
    } catch (error) {
      handleWorkflow(error, res, next);
    }
  });
  router.post("/system/:id/test", (req, res) =>
    res.json({
      simulated: true,
      externalActionExecuted: false,
      id: req.params.id,
      testedAt: new Date().toISOString()
    })
  );
  router.get("/send-preview", (_req, res) =>
    res.json({
      operation: "Plantio Mecanizado",
      group: "Plantio / Muda / Preparo",
      shift: "C",
      scheduledAt: "21:45",
      spreadsheet: "Planilha Plantio cana.xlsm",
      sheet: "PLANTIO",
      range: "A1:AI26",
      legend: "🚜 Plantio — situação atual do turno",
      imagePreview: "Prévia simulada da área A1:AI26",
      simulationMode: true
    })
  );
  router.post("/send-preview/confirm", async (req, res, next) => {
    try {
      const ctx = await context();
      const event = ctx.engine.append({
        type: "REPORT_SENT",
        source: "PANEL",
        approved: true,
        priority: "normal",
        operation: "Plantio Mecanizado",
        group: req.body.destination,
        observation: req.body.legend,
        shift: "C",
        user: res.locals.user?.name ?? "Operador",
        responsible: res.locals.user?.name ?? "Operador"
      });
      await ctx.persistEvent(event);
      res.json({
        simulated: true,
        externalActionExecuted: false,
        status: "PROCESSED",
        event,
        destination: req.body.destination,
        legend: req.body.legend,
        simulatedAt: event.timestamp
      });
    } catch (error) {
      next(error);
    }
  });
  router.get("/shift-report", async (_req, res, next) => {
    try {
      const ctx = await context();
      const draft = ctx.workflow.reports.getDraft();
      const text = draft.includes("RELATÓRIO DE TROCA DE TURNO")
        ? draft
        : "*📋 RELATÓRIO DE TROCA DE TURNO*\n\nSem rascunho persistido.";
      res.json({ status: "DRAFT", journal: ctx.engine.shiftJournal("C"), text });
    } catch (error) {
      next(error);
    }
  });
  router.post("/shift-report", async (req, res, next) => {
    try {
      const ctx = await context();
      const event = ctx.engine.append({
        type: req.body.action === "confirm" ? "SHIFT_REPORT_SENT" : "SHIFT_REPORT_CREATED",
        source: "PANEL",
        approved: true,
        priority: "normal",
        observation: "Relatório de troca de turno",
        shift: "C",
        user: res.locals.user?.name ?? "Operador",
        responsible: res.locals.user?.name ?? "Operador"
      });
      ctx.workflow.reports.saveDraft(String(req.body.text ?? ""));
      await ctx.persistDraft(String(req.body.text ?? ""));
      await ctx.persistEvent(event);
      res.json({
        simulated: true,
        externalActionExecuted: false,
        status: req.body.action === "confirm" ? "CONFIRMED" : "DRAFT",
        text: req.body.text,
        event,
        savedAt: event.timestamp
      });
    } catch (error) {
      next(error);
    }
  });
  return router;
}

function eventIds(ctx: OperationalContext) {
  return new Set(ctx.engine.all().map((event) => event.id));
}
function pendingSummary(ctx: OperationalContext) {
  const persisted = ctx.workflow.pendings
    .list()
    .map((item) => ({
      id: item.id,
      operation: item.interpretation.operation ?? "Não informada",
      subject: `Frota ${item.interpretation.mainEquipment ?? "sem frota"}`,
      reason: item.reason === "DOUBT" ? "Revisão necessária" : "Alteração aguardando aprovação",
      since: item.createdAt,
      priority: item.interpretation.confidence < 0.6 ? "urgent" : "high",
      status: item.status === "OPEN" ? "open" : "resolved"
    }));
  const demo = ctx.engine
    .timeline()
    .filter((event) => event.type === "PENDING_CREATED")
    .map((event) => ({
      id: event.fleet === "625" ? "pen-625" : `pen-${event.id}`,
      eventId: event.id,
      operation: event.operation ?? "Não informada",
      subject: event.fleet ? `Frota ${event.fleet}` : "Mensagem sem frota",
      reason: event.observation ?? "Alteração aguardando aprovação",
      since: event.timestamp,
      priority: event.priority,
      status: "open"
    }));
  return [
    ...persisted,
    ...demo.filter(
      (item) =>
        !persisted.some(
          (existing) => existing.subject === item.subject && existing.status === "open"
        )
    )
  ];
}
function systemStatus(
  mode: "memory" | "prisma",
  ctx: OperationalContext,
  local = false,
  integrations: Record<string, string> = {}
) {
  const state = (kind: string) => (integrations[kind] === "ONLINE" ? "online" : "offline");
  const rows = local
    ? [
        ["API", "online", "API local respondendo"],
        ["Banco de dados", "online", "PostgreSQL operacional persistente"],
        ["WhatsApp", state("WHATSAPP"), "Monitoramento de mensagens recebidas"],
        ["Excel", "online", "Leitura das planilhas operacionais"],
        ["Agente Excel", state("EXCEL_AGENT"), "Escrita e releitura verificadas"],
        ["Monitoramento", "online", "Operação ativa"],
        ["Notificações", "online", "Registros locais"],
        ["Operação", "online", "Excel real ativo"]
      ]
    : [
        ["API", "online", "API local respondendo"],
        [
          "Banco de dados",
          mode === "prisma" ? "online" : "waiting",
          mode === "prisma"
            ? `PostgreSQL operacional persistente · mensagens ${ctx.workflow.messages.list().length}`
            : "Aguardando PostgreSQL"
        ],
        ["WhatsApp", "waiting", "Aguardando conexão"],
        ["Excel", "waiting", "Aguardando agente"],
        ["Agente Excel", "waiting", "Aguardando agente"],
        ["Monitoramento", "waiting", "Aguardando ativação"],
        ["Notificações", "waiting", "Registros locais"],
        ["Operação", "waiting", "Aguardando ativação"]
      ];
  return rows.map(([name, status, message], index) => ({
    id: `sys-${index}`,
    name,
    state: status,
    message,
    updatedAt: new Date().toISOString(),
    testable: true
  }));
}
function handleWorkflow(
  error: unknown,
  res: { status: (status: number) => { json: (value: unknown) => void } },
  next: (error: unknown) => void
) {
  if (error instanceof WorkflowError)
    return res.status(error.status).json({ message: error.message });
  next(error);
}

function demoSeed(): DemoEvent[] {
  const now = new Date();
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();
  const common = {
    shift: "C",
    user: "Operador Simulado",
    responsible: "Operador Simulado",
    source: "SIMULATION" as const,
    simulated: true,
    approved: true,
    priority: "normal" as const
  };
  return [
    {
      ...common,
      id: "demo-shift-started",
      type: "SHIFT_STARTED",
      timestamp: ago(120),
      observation: "Turno C iniciado"
    },
    {
      ...common,
      id: "demo-stop-626",
      type: "STOPPED",
      timestamp: ago(42),
      fleet: "626",
      operation: "Plantio Mecanizado",
      newStatus: "PARADO",
      newDescription: "Cilindro de inclinação quebrado",
      newSector: "D1",
      priority: "high"
    },
    {
      ...common,
      id: "demo-stop-1530",
      type: "STOPPED",
      timestamp: ago(31),
      fleet: "1530/2006",
      implement: "2006",
      operation: "Colheita de Muda",
      newStatus: "PARADO",
      newDescription: "Atolada",
      newSector: "Chapadinha",
      priority: "high"
    },
    {
      ...common,
      id: "demo-message-625",
      type: "MESSAGE_RECEIVED",
      timestamp: ago(19),
      fleet: "625",
      operation: "Plantio Mecanizado",
      group: "Plantio / Muda / Preparo",
      originalMessage: "Frota 625 parada, bico injetor e fumaça preta",
      observation: "Mensagem recebida"
    },
    {
      ...common,
      id: "demo-pending-625",
      type: "PENDING_CREATED",
      timestamp: ago(18),
      fleet: "625",
      operation: "Plantio Mecanizado",
      group: "Plantio / Muda / Preparo",
      newStatus: "PARADO",
      newDescription: "Bico injetor / fumaça preta",
      newSector: "D1",
      approved: false,
      priority: "urgent"
    },
    {
      ...common,
      id: "demo-stop-625",
      type: "STOPPED",
      timestamp: ago(18),
      fleet: "625",
      operation: "Plantio Mecanizado",
      newStatus: "PARADO",
      newDescription: "Bico injetor / fumaça preta",
      newSector: "D1",
      priority: "urgent"
    },
    {
      ...common,
      id: "demo-displaced-1531",
      type: "DISPLACED",
      timestamp: ago(12),
      fleet: "1531/830",
      implement: "830",
      operation: "Colheita de Muda",
      newStatus: "DESLOCAMENTO",
      newDescription: "Deslocamento para Chapadinha",
      newSector: "Estrada"
    },
    {
      ...common,
      id: "demo-status-1601",
      type: "STATUS_CHANGED",
      timestamp: ago(8),
      fleet: "1601",
      operation: "Preparo de Solo",
      newStatus: "DISPONIVEL",
      newDescription: "Disponível",
      newSector: "J2"
    },
    {
      ...common,
      id: "demo-error-cpd",
      type: "ERROR",
      timestamp: ago(4),
      operation: "CPD",
      group: "CPD",
      originalMessage: "Informação sem identificação da frota",
      observation: "Falha de processamento",
      priority: "high"
    }
  ];
}
