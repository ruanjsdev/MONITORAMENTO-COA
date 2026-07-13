import { Prisma, PrismaClient } from "@prisma/client";
import { OperationalExcelAdapter } from "./excel-adapters.js";
import { activeReportTimes, buildHourlyReport, defaultSchedule, dueScheduleSlots, reportExecutionKey, ReportSchedule } from "./report-scheduler.js";
import { Clock, operationalDateForSchedule, operationalParts, operationalTimezone, parseMinutes } from "./clock.js";

export type ReportExecutionStatus = "SCHEDULED" | "GENERATING" | "WAITING_APPROVAL" | "APPROVED" | "REJECTED" | "READY_TO_SEND" | "SENT" | "FAILED" | "EXPIRED";
export type ImageState = "NOT_REQUESTED" | "WAITING_AGENT" | "GENERATED" | "FAILED" | "MOCK";

export type ReportExecution = {
  id: string;
  idempotencyKey: string;
  scheduleId: string;
  operation: string;
  groupName: string;
  shift: string;
  operationalDate: string;
  scheduledTime: string;
  generatedAt?: string;
  text: string;
  editedText?: string;
  withoutForecast: unknown[];
  expired: unknown[];
  alerts: unknown[];
  imageState: ImageState;
  imageMessage: string;
  dataSource: string;
  status: ReportExecutionStatus;
  lateGeneration: boolean;
  missed: boolean;
  sendMessage: false;
  sendReaction: false;
};

const queueKey = "REPORT_EXECUTION_QUEUE";

export class ReportQueueService {
  constructor(private readonly prisma: PrismaClient, private readonly adapter: OperationalExcelAdapter, private readonly clock = new Clock()) {}

  async list() {
    return this.readQueue();
  }

  async tick(schedules: ReportSchedule[]) {
    const created: ReportExecution[] = [];
    const missed: ReportExecution[] = [];
    const now = this.clock.now();
    for (const schedule of schedules) {
      for (const slot of dueScheduleSlots(schedule, now)) {
        const existing = await this.findByKey(reportExecutionKey(schedule, slot));
        if (existing) continue;
        created.push(await this.generate(schedule, slot, slot.late));
      }
      missed.push(...await this.markMissed(schedule, now));
    }
    return { created, missed, nextRunAt: new Date(now.getTime() + 60_000).toISOString(), timezone: operationalTimezone };
  }

  async generateNow(schedule: ReportSchedule, options: { late?: boolean; scheduledTime?: string; operationalDate?: string } = {}) {
    const now = this.clock.now();
    const slot = { scheduledTime: options.scheduledTime ?? "MANUAL", operationalDate: options.operationalDate ?? now.toISOString().slice(0, 10), late: Boolean(options.late), lateByMinutes: 0 };
    return this.generate(schedule, slot, Boolean(options.late), true);
  }

  async approve(id: string) {
    return this.update(id, execution => ({ ...execution, status: "READY_TO_SEND", sendMessage: false, sendReaction: false }));
  }

  async reject(id: string) {
    return this.update(id, execution => ({ ...execution, status: "REJECTED" }));
  }

  async edit(id: string, text: string) {
    return this.update(id, execution => ({ ...execution, editedText: text, text, status: execution.status === "REJECTED" ? "WAITING_APPROVAL" : execution.status }));
  }

  async regenerate(id: string, schedules: ReportSchedule[]) {
    const execution = (await this.readQueue()).find(item => item.id === id);
    if (!execution) throw new Error("REPORT_NOT_FOUND");
    const schedule = schedules.find(item => item.id === execution.scheduleId) ?? { ...defaultSchedule, id: execution.scheduleId, operation: execution.operation, groupName: execution.groupName, shift: execution.shift };
    return this.generate(schedule, { scheduledTime: execution.scheduledTime, operationalDate: execution.operationalDate, late: execution.lateGeneration }, execution.lateGeneration, false, id);
  }

  private async generate(schedule: ReportSchedule, slot: { scheduledTime: string; operationalDate: string; late?: boolean }, lateGeneration: boolean, manual = false, replaceId?: string) {
    const idempotencyKey = manual ? `manual|${Date.now()}|${Math.random()}` : reportExecutionKey(schedule, slot);
    const existing = !manual ? await this.findByKey(idempotencyKey) : null;
    if (existing && !replaceId) return existing;
    const state = await this.adapter.readOperationState({ operation: schedule.operation });
    const report = buildHourlyReport(schedule, state.items, this.clock.now());
    const picture = await this.adapter.generatePicture({ operation: schedule.operation });
    const execution: ReportExecution = {
      id: replaceId ?? idempotencyKey,
      idempotencyKey,
      scheduleId: schedule.id,
      operation: schedule.operation,
      groupName: schedule.groupName,
      shift: schedule.shift,
      operationalDate: slot.operationalDate,
      scheduledTime: slot.scheduledTime,
      generatedAt: this.clock.now().toISOString(),
      text: report.text,
      withoutForecast: report.withoutForecast,
      expired: report.expired,
      alerts: report.alerts,
      imageState: picture.simulated ? "MOCK" : picture.generated ? "GENERATED" : "FAILED",
      imageMessage: picture.message,
      dataSource: state.adapter,
      status: schedule.requiresApproval ? "WAITING_APPROVAL" : "READY_TO_SEND",
      lateGeneration,
      missed: false,
      sendMessage: false,
      sendReaction: false
    };
    await this.upsert(execution);
    return execution;
  }

  private async markMissed(schedule: ReportSchedule, now: Date) {
    const missed: ReportExecution[] = [];
    if (!schedule.enabled) return missed;
    const { time: currentTime } = operationalParts(now);
    const current = parseMinutes(currentTime);
    for (const scheduledTime of activeReportTimes(schedule)) {
      const scheduled = parseMinutes(scheduledTime);
      const elapsed = current - scheduled >= 0 ? current - scheduled : current + 1440 - scheduled;
      if (elapsed <= schedule.catchUpWindowMinutes || elapsed >= Math.max(1, schedule.intervalHours) * 60) continue;
      const operationalDate = operationalDateForSchedule(now, schedule.startTime, schedule.endTime);
      const idempotencyKey = reportExecutionKey(schedule, { scheduledTime, operationalDate });
      if (await this.findByKey(idempotencyKey)) continue;
      const execution: ReportExecution = {
        id: idempotencyKey,
        idempotencyKey,
        scheduleId: schedule.id,
        operation: schedule.operation,
        groupName: schedule.groupName,
        shift: schedule.shift,
        operationalDate,
        scheduledTime,
        text: "",
        withoutForecast: [],
        expired: [],
        alerts: [{ code: "MISSED_REPORT", message: `Relatório ${scheduledTime} perdeu a janela de catch-up.` }],
        imageState: "NOT_REQUESTED",
        imageMessage: "Imagem não solicitada.",
        dataSource: "mock",
        status: "EXPIRED",
        lateGeneration: false,
        missed: true,
        sendMessage: false,
        sendReaction: false
      };
      await this.upsert(execution);
      missed.push(execution);
    }
    return missed;
  }

  private async update(id: string, mapper: (execution: ReportExecution) => ReportExecution) {
    const queue = await this.readQueue();
    const index = queue.findIndex(item => item.id === id);
    if (index < 0) throw new Error("REPORT_NOT_FOUND");
    queue[index] = mapper(queue[index]!);
    await this.writeQueue(queue);
    return queue[index]!;
  }

  private async findByKey(idempotencyKey: string) {
    return (await this.readQueue()).find(item => item.idempotencyKey === idempotencyKey) ?? null;
  }

  private async upsert(execution: ReportExecution) {
    const queue = await this.readQueue();
    const index = queue.findIndex(item => item.id === execution.id || item.idempotencyKey === execution.idempotencyKey);
    if (index >= 0) queue[index] = execution;
    else queue.unshift(execution);
    await this.writeQueue(queue.slice(0, 200));
  }

  private async readQueue(): Promise<ReportExecution[]> {
    const setting = await this.prisma.generalSetting.findUnique({ where: { key: queueKey } });
    return Array.isArray(setting?.value) ? setting.value as unknown as ReportExecution[] : [];
  }

  private async writeQueue(value: ReportExecution[]) {
    await this.prisma.generalSetting.upsert({ where: { key: queueKey }, create: { key: queueKey, value: value as Prisma.InputJsonArray }, update: { value: value as Prisma.InputJsonArray, version: { increment: 1 } } });
  }
}
