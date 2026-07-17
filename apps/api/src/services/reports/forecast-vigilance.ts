import { Prisma, PrismaClient } from "@prisma/client";
import { OperationalExcelAdapter } from "./excel-adapters.js";
import { evaluateForecasts } from "./forecast-engine.js";
import { Clock } from "./clock.js";

export class ForecastVigilanceService {
  constructor(private readonly prisma: PrismaClient, private readonly adapter: OperationalExcelAdapter, private readonly clock = new Clock()) {}

  async check(operation: string) {
    const state = await this.adapter.readOperationState({ operation });
    const forecast = evaluateForecasts(state.items, this.clock.now());
    const created = [];
    for (const item of forecast.expired) {
      const key = `FORECAST_EXPIRED|${operation}|${item.fleet}|${item.forecastAt ?? "missing"}`;
      const existing = await this.prisma.systemLog.findFirst({ where: { action: "FORECAST_EXPIRED", entityId: key } });
      if (existing) continue;
      const preview = await this.adapter.prepareChanges({ operation, fleet: item.fleet, implement: item.implement, proposed: { forecastState: "MISSING", forecastAt: null } });
      const log = await this.prisma.systemLog.create({
        data: {
          action: "FORECAST_EXPIRED",
          entity: "Forecast",
          entityId: key,
          message: `Previsão vencida para frota ${item.fleet}; proposta SEM PREVISÃO criada para aprovação.`,
          metadata: { operation, fleet: item.fleet, previousForecastAt: item.forecastAt, expiredAt: this.clock.now().toISOString(), preview, policy: "CREATE_PENDING", sendMessage: false, sendReaction: false } as Prisma.InputJsonObject,
          result: "PENDING_APPROVAL"
        }
      });
      created.push(log);
    }
    return { operation, checkedAt: this.clock.now().toISOString(), expired: forecast.expired, alertsCreated: created, withoutForecast: forecast.withoutForecast };
  }
}
