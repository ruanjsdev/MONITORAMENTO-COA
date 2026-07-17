import { PrismaClient } from "@prisma/client";
import { createOperationalExcelAdapter } from "./excel-adapters.js";
import { Clock, operationalTimezone } from "./clock.js";
import { ReportQueueService } from "./report-queue.js";
import { defaultSchedule, ReportSchedule } from "./report-scheduler.js";
import { ForecastVigilanceService } from "./forecast-vigilance.js";

const scheduleKey = "REPORT_SCHEDULES";

export async function loadReportSchedules(prisma: PrismaClient): Promise<ReportSchedule[]> {
  const setting = await prisma.generalSetting.findUnique({ where: { key: scheduleKey } });
  const stored = Array.isArray(setting?.value) ? setting.value as unknown as ReportSchedule[] : [];
  return stored.length ? stored : [defaultSchedule];
}

export function startReportSchedulerWorker(prisma = new PrismaClient(), clock = new Clock()) {
  const adapter = createOperationalExcelAdapter();
  const queue = new ReportQueueService(prisma, adapter, clock);
  const vigilance = new ForecastVigilanceService(prisma, adapter, clock);
  let running = false;
  async function tick() {
    if (running) return;
    running = true;
    try {
      const schedules = await loadReportSchedules(prisma);
      for (const operation of new Set(schedules.map(schedule => schedule.operation))) await vigilance.check(operation);
      const result = await queue.tick(schedules);
      if (result.created.length || result.missed.length) console.log(`Agendador de relatórios: ${result.created.length} criado(s), ${result.missed.length} perdido(s), timezone ${operationalTimezone}.`);
    } catch (error) {
      console.error("Falha no agendador de relatórios:", error);
    } finally {
      running = false;
    }
  }
  void tick();
  const timer = setInterval(() => void tick(), 60_000);
  return { stop: () => clearInterval(timer), tick };
}
