import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Clock } from "../apps/api/src/services/reports/clock";
import { MockOperationalExcelAdapter } from "../apps/api/src/services/reports/excel-adapters";
import { ForecastVigilanceService } from "../apps/api/src/services/reports/forecast-vigilance";

const prisma = new PrismaClient();

describe("vigilância de previsões", () => {
  beforeEach(async () => {
    await prisma.systemLog.deleteMany({ where: { action: "FORECAST_EXPIRED" } });
  });
  afterAll(async () => prisma.$disconnect());

  it("cria alerta idempotente para previsão vencida e proposta SEM PREVISÃO", async () => {
    const adapter = new MockOperationalExcelAdapter([{ operation: "Plantio de Cana", fleet: "1529", implement: "829", status: "PARADO", description: "MANGUEIRA ESTOURADA", startedAt: "2026-07-13T00:00:00.000Z", forecastAt: "2026-07-13T01:30:00.000Z", forecastState: "VALID", updatedAt: "2026-07-13T01:00:00.000Z", history: [] }]);
    const service = new ForecastVigilanceService(prisma, adapter, new Clock(new Date("2026-07-13T05:00:00.000Z")));
    const first = await service.check("Plantio de Cana");
    const second = await service.check("Plantio de Cana");
    expect(first.alertsCreated).toHaveLength(1);
    expect(second.alertsCreated).toHaveLength(0);
    const metadata = first.alertsCreated[0]?.metadata as any;
    expect(metadata.preview.proposed.forecast.displayValue).toBe("SEM PREVISÃO");
    expect(metadata.policy).toBe("CREATE_PENDING");
  });
});
