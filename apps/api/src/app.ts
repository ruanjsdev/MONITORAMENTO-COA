import cors from "cors";
import express from "express";
import { SIMULATION_BANNER, canSendReaction } from "@coa-bot/shared";
import { authMiddleware } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error-handler.js";
import { createMemoryDataSource, createPrismaDataSource, DataSource } from "./repositories/data-source.js";
import { resolveDatabaseMode } from "./config/database-mode.js";
import { createStore } from "./store.js";
import { authRoutes } from "./modules/auth/routes.js";
import { groupRoutes } from "./modules/groups/routes.js";
import { operationRoutes } from "./modules/operations/routes.js";
import { pendingChangeRoutes } from "./modules/pending-changes/routes.js";
import { spreadsheetRoutes } from "./modules/spreadsheets/routes.js";
import { testRoutes } from "./modules/tests/routes.js";
import { logRoutes } from "./modules/logs/routes.js";
import { integrationRoutes } from "./modules/integrations/routes.js";
import { operationalRoutes } from "./modules/operational/routes.js";
import { excelAgentPublicRoutes, excelHomologationRoutes } from "./modules/excel-homologation/routes.js";

export function createApp(source: DataSource = createDefaultDataSource()) {
  const app = express();
  const jwtSecret = process.env.JWT_SECRET ?? "dev-secret";
  const auth = authMiddleware(jwtSecret);

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, simulationMode: source.simulationMode, banner: SIMULATION_BANNER });
  });

  app.use("/auth", authRoutes(source, jwtSecret));
  app.use("/excel-agent/local", excelAgentPublicRoutes());
  app.use(auth);
  app.get("/dashboard", async (_req, res, next) => {
    try {
      res.json(await source.dashboard());
    } catch (error) {
      next(error);
    }
  });
  app.use("/groups", groupRoutes(source));
  app.use("/operations", operationRoutes(source));
  app.use("/pending-changes", pendingChangeRoutes(source));
  app.post("/messages/simulate", async (req, res, next) => {
    try {
      res.status(201).json(await source.simulateMessage(req.body, res.locals.user?.id));
    } catch (error) {
      next(error);
    }
  });
  app.use("/spreadsheets", spreadsheetRoutes(source));
  app.use("/tests", testRoutes(source));
  app.use("/logs", logRoutes(source));
  app.use("/", integrationRoutes(source));
  app.use("/operational", operationalRoutes());
  app.use("/excel-homologation", excelHomologationRoutes());
  app.post("/whatsapp/reaction/check", (req, res) => {
    res.json({
      allowed: canSendReaction({
        simulationMode: source.simulationMode,
        approvedByAdmin: Boolean(req.body.approvedByAdmin),
        databaseUpdated: Boolean(req.body.databaseUpdated),
        excelUpdated: Boolean(req.body.excelUpdated),
        cellsConfirmed: Boolean(req.body.cellsConfirmed),
        historyRegistered: Boolean(req.body.historyRegistered),
        reaction: req.body.reaction
      })
    });
  });
  app.use(errorHandler);
  return app;
}

function createDefaultDataSource() {
  return resolveDatabaseMode() === "memory" ? createMemoryDataSource(createStore()) : createPrismaDataSource();
}
