import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Clock, operationalDateForSchedule, operationalParts } from "../apps/api/src/services/reports/clock";
import { MockOperationalExcelAdapter } from "../apps/api/src/services/reports/excel-adapters";
import { ReportQueueService } from "../apps/api/src/services/reports/report-queue";
import { activeReportTimes, defaultSchedule, dueScheduleSlots, ReportSchedule } from "../apps/api/src/services/reports/report-scheduler";

const prisma = new PrismaClient();
const enabled: ReportSchedule = { ...defaultSchedule, enabled: true, startTime: "19:00", endTime: "07:00", specificTimes: [], intervalHours: 1, catchUpWindowMinutes: 15 };

describe("agendador real e fila de relatórios", () => {
  beforeEach(async () => {
    await prisma.generalSetting.deleteMany({ where: { key: "REPORT_EXECUTION_QUEUE" } });
  });
  afterAll(async () => prisma.$disconnect());

  it("usa timezone operacional America/Belem e relógio injetável", () => {
    const date = new Date("2026-07-13T04:00:00.000Z");
    expect(operationalParts(date, "America/Belem").time).toBe("01:00");
  });

  it("gera horários em turno atravessando meia-noite", () => {
    expect(activeReportTimes(enabled)).toEqual(["00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00", "19:00", "20:00", "21:00", "22:00", "23:00"]);
    expect(operationalDateForSchedule(new Date("2026-07-14T04:00:00.000Z"), "19:00", "07:00", "America/Belem")).toBe("2026-07-13");
  });

  it("detecta relatório devido e não duplica após reinicialização", async () => {
    const clock = new Clock(new Date("2026-07-13T04:00:00.000Z"));
    const queue = new ReportQueueService(prisma, new MockOperationalExcelAdapter(), clock);
    expect(dueScheduleSlots(enabled, clock.now(), "America/Belem")[0]?.scheduledTime).toBe("01:00");
    const first = await queue.tick([enabled]);
    const second = await new ReportQueueService(prisma, new MockOperationalExcelAdapter(), clock).tick([enabled]);
    expect(first.created).toHaveLength(1);
    expect(second.created).toHaveLength(0);
  });

  it("faz catch-up dentro da janela e marca geração atrasada", async () => {
    const queue = new ReportQueueService(prisma, new MockOperationalExcelAdapter(), new Clock(new Date("2026-07-13T04:08:00.000Z")));
    const result = await queue.tick([enabled]);
    expect(result.created[0]?.lateGeneration).toBe(true);
    expect(result.created[0]?.scheduledTime).toBe("01:00");
  });

  it("aprova, rejeita, edita e mantém envio bloqueado", async () => {
    const queue = new ReportQueueService(prisma, new MockOperationalExcelAdapter(), new Clock(new Date("2026-07-13T04:00:00.000Z")));
    const created = (await queue.tick([enabled])).created[0]!;
    const edited = await queue.edit(created.id, "texto revisado");
    expect(edited.text).toBe("texto revisado");
    const approved = await queue.approve(created.id);
    expect(approved.status).toBe("READY_TO_SEND");
    expect(approved.sendMessage).toBe(false);
    const rejected = await queue.reject(created.id);
    expect(rejected.status).toBe("REJECTED");
  });

  it("identifica imagem mock no Linux", async () => {
    const queue = new ReportQueueService(prisma, new MockOperationalExcelAdapter(), new Clock(new Date("2026-07-13T04:00:00.000Z")));
    const created = (await queue.tick([enabled])).created[0]!;
    expect(created.imageState).toBe("MOCK");
    expect(created.imageMessage).toMatch(/simulada/i);
  });
});
