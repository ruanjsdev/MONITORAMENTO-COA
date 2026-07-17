import { Prisma, PrismaClient } from "@prisma/client";
import { Router } from "express";
import { createHash } from "node:crypto";
import { createOperationalExcelAdapter } from "../../services/reports/excel-adapters.js";
import { compareWithOperationState, parseAdvancedOperationalReport } from "../../services/reports/advanced-parser.js";
import { buildHourlyReport, defaultSchedule, ReportSchedule, validateSchedule } from "../../services/reports/report-scheduler.js";
import { evaluateForecasts } from "../../services/reports/forecast-engine.js";
import { Clock, operationalTimezone } from "../../services/reports/clock.js";
import { ReportQueueService } from "../../services/reports/report-queue.js";
import { ForecastVigilanceService } from "../../services/reports/forecast-vigilance.js";

const scheduleKey = "REPORT_SCHEDULES";

export function reportRoutes(prisma = new PrismaClient()) {
  const router = Router();
  const adapter = createOperationalExcelAdapter();
  const clock = new Clock();
  const queue = new ReportQueueService(prisma, adapter, clock);
  const vigilance = new ForecastVigilanceService(prisma, adapter, clock);

  async function schedules(): Promise<ReportSchedule[]> {
    const setting = await prisma.generalSetting.findUnique({ where: { key: scheduleKey } });
    const stored = Array.isArray(setting?.value) ? setting.value as unknown as ReportSchedule[] : [];
    return stored.length ? stored : [defaultSchedule];
  }

  async function saveSchedules(value: ReportSchedule[]) {
    await prisma.generalSetting.upsert({ where: { key: scheduleKey }, create: { key: scheduleKey, value }, update: { value, version: { increment: 1 } } });
  }

  router.get("/schedules", async (_req, res, next) => {
    try { res.json({ schedules: await schedules(), timezone: operationalTimezone, sendMessage: false, sendReaction: false }); } catch (error) { next(error); }
  });

  router.put("/schedules/:id", async (req, res, next) => {
    try {
      const all = await schedules();
      const nextSchedule = validateSchedule({ ...(all.find(item => item.id === req.params.id) ?? defaultSchedule), ...req.body, id: req.params.id });
      const updated = [...all.filter(item => item.id !== req.params.id), nextSchedule];
      await saveSchedules(updated);
      res.json({ schedule: nextSchedule, sendMessage: false, sendReaction: false });
    } catch (error) { next(error); }
  });

  router.post("/preview", async (req, res, next) => {
    try {
      const schedule = validateSchedule({ ...defaultSchedule, ...req.body });
      const state = await adapter.readOperationState({ operation: schedule.operation });
      res.json({ schedule, report: buildHourlyReport(schedule, state.items, requestedDate(req.body.at, clock)), adapter: process.env.EXCEL_ADAPTER ?? "mock", timezone: operationalTimezone });
    } catch (error) { next(error); }
  });

  router.post("/generate-now", async (req, res, next) => {
    try {
      const schedule = validateSchedule({ ...(await schedules())[0], ...req.body });
      const execution = await queue.generateNow(schedule);
      const report = { text: execution.text, withoutForecast: execution.withoutForecast, expired: execution.expired, alerts: execution.alerts, summaryIncluded: false, sendMessage: false, sendReaction: false };
      const picture = { simulated: execution.imageState === "MOCK", message: execution.imageMessage };
      await prisma.systemLog.create({ data: { action: "REPORT_GENERATED_NOW", message: "Relatório horário gerado sem envio externo.", metadata: { operation: schedule.operation, sendMessage: false, sendReaction: false }, result: "SIMULATED" } });
      res.json({ execution, report, picture, externalActionExecuted: false, sendMessage: false, sendReaction: false });
    } catch (error) { next(error); }
  });

  router.post("/generate-test", async (req, res, next) => {
    try {
      const schedule = validateSchedule({ ...defaultSchedule, ...req.body, testGroup: true });
      const state = await adapter.readOperationState({ operation: schedule.operation });
      res.json({ test: true, report: buildHourlyReport(schedule, state.items, requestedDate(req.body.at, clock)), externalActionExecuted: false, sendMessage: false, sendReaction: false });
    } catch (error) { next(error); }
  });

  router.get("/forecast", async (req, res, next) => {
    try {
      const operation = String(req.query.operation ?? defaultSchedule.operation);
      const state = await adapter.readOperationState({ operation });
      const forecast = evaluateForecasts(state.items, requestedDate(req.query.at, clock));
      res.json({ operation, withoutForecast: forecast.withoutForecast, expired: forecast.expired, alerts: forecast.alerts });
    } catch (error) { next(error); }
  });

  router.post("/forecast/check", async (req, res, next) => {
    try { res.json(await vigilance.check(String(req.body.operation ?? defaultSchedule.operation))); } catch (error) { next(error); }
  });

  router.post("/parse-long-report", async (req, res, next) => {
    try {
      const parsed = parseAdvancedOperationalReport(String(req.body.text ?? ""), { operation: req.body.operation, shift: req.body.shift });
      const state = await adapter.readOperationState({ operation: parsed.sections[0]?.operation ?? defaultSchedule.operation });
      const comparison = compareWithOperationState(parsed.items, state.items);
      res.json({ ...parsed, comparison, pendingCandidates: comparison.changes, externalActionExecuted: false });
    } catch (error) { next(error); }
  });

  router.post("/messages/edited", async (req, res, next) => {
    try {
      const groupJid = String(req.body.groupJid ?? "");
      const messageId = String(req.body.messageId ?? "");
      const content = String(req.body.content ?? "");
      const versionKey = createHash("sha256").update(`${groupJid}:${messageId}`).digest("hex");
      const previous = await prisma.systemLog.findFirst({ where: { action: "MESSAGE_VERSION_RECEIVED", entityId: versionKey }, orderBy: { createdAt: "desc" } });
      const parsed = parseAdvancedOperationalReport(content, { shift: req.body.shift });
      await prisma.systemLog.create({
        data: {
          action: previous ? "MESSAGE_EDITED" : "MESSAGE_VERSION_RECEIVED",
          entity: "OperationalMessageVersion",
          entityId: versionKey,
          message: previous ? "Mensagem editada reprocessada; nenhuma ação externa executada." : "Versão inicial de mensagem registrada.",
          beforeValue: previous?.afterValue ?? undefined,
          afterValue: { groupJid, messageId, content, parsed } as Prisma.InputJsonObject,
          metadata: { edited: Boolean(previous), versionKey, sendMessage: false, sendReaction: false },
          result: "SUCCESS"
        }
      });
      res.json({ edited: Boolean(previous), versionKey, parsed, action: previous ? "CREATE_CORRECTION_PENDING_IF_APPLIED" : "UPDATE_OPEN_PENDING_IF_EXISTS", externalActionExecuted: false });
    } catch (error) { next(error); }
  });

  router.get("/alerts", async (_req, res, next) => {
    try {
      const state = await adapter.readOperationState({ operation: defaultSchedule.operation });
      const forecast = evaluateForecasts(state.items);
      const logs = await prisma.systemLog.findMany({ where: { action: { in: ["MESSAGE_EDITED", "REPORT_GENERATED_NOW"] } }, orderBy: { createdAt: "desc" }, take: 20 });
      res.json({ alerts: forecast.alerts, parserEvents: logs });
    } catch (error) { next(error); }
  });

  router.get("/queue", async (_req, res, next) => {
    try { res.json({ reports: await queue.list(), timezone: operationalTimezone, sendMessage: false, sendReaction: false }); } catch (error) { next(error); }
  });

  router.post("/scheduler/tick", async (_req, res, next) => {
    try { res.json(await queue.tick(await schedules())); } catch (error) { next(error); }
  });

  router.post("/queue/:id/approve", async (req, res, next) => {
    try { res.json({ report: await queue.approve(String(req.params.id)), message: "Relatório aprovado e pronto. Envio ao WhatsApp continua bloqueado.", sendMessage: false, sendReaction: false }); } catch (error) { next(error); }
  });

  router.post("/queue/:id/reject", async (req, res, next) => {
    try { res.json({ report: await queue.reject(String(req.params.id)), sendMessage: false, sendReaction: false }); } catch (error) { next(error); }
  });

  router.put("/queue/:id/text", async (req, res, next) => {
    try { res.json({ report: await queue.edit(String(req.params.id), String(req.body.text ?? "")), sendMessage: false, sendReaction: false }); } catch (error) { next(error); }
  });

  router.post("/queue/:id/regenerate", async (req, res, next) => {
    try { res.json({ report: await queue.regenerate(String(req.params.id), await schedules()), sendMessage: false, sendReaction: false }); } catch (error) { next(error); }
  });

  router.get("/shift-closing", async (_req, res, next) => {
    try {
      const state = await adapter.readOperationState({ operation: defaultSchedule.operation });
      const forecast = evaluateForecasts(state.items);
      const logs = await prisma.systemLog.findMany({ where: { action: { in: ["MESSAGE_EDITED", "MESSAGE_VERSION_RECEIVED"] } }, orderBy: { createdAt: "desc" }, take: 20 });
      const lines = [
        "Fechamento do Turno",
        `Operação: ${defaultSchedule.operation}`,
        `Turno: ${defaultSchedule.shift}`,
        "",
        "Estado final:",
        ...state.items.map(item => `• ${item.fleet} — ${item.status}: ${item.description}`),
        "",
        "Frotas sem previsão:",
        ...(forecast.withoutForecast.length ? forecast.withoutForecast.map(item => `• ${item.fleet} — ${item.description}`) : ["• Nenhuma"]),
        "",
        "Mensagens editadas:",
        ...(logs.filter(log => log.action === "MESSAGE_EDITED").length ? logs.filter(log => log.action === "MESSAGE_EDITED").map(log => `• ${log.createdAt.toISOString()} — ${log.entityId}`) : ["• Nenhuma"])
      ];
      res.json({ text: lines.join("\n"), state: state.items, withoutForecast: forecast.withoutForecast, expired: forecast.expired, alerts: forecast.alerts, editedMessages: logs, externalActionExecuted: false });
    } catch (error) { next(error); }
  });

  return router;
}

function requestedDate(input: unknown, clock: Clock) {
  if (!input) return clock.now();
  const date = new Date(String(input));
  return Number.isNaN(date.getTime()) ? clock.now() : date;
}
