import { Router } from "express";
import { DataSource } from "../../repositories/data-source.js";
import { asyncHandler } from "../../middleware/async-handler.js";

export function integrationRoutes(source: DataSource) {
  const router = Router();
  router.post("/excel-agent/register", asyncHandler(async (req, res) => {
    res.json(await source.registerExcelAgent(req.body));
  }));
  router.get("/excel-agent/status", asyncHandler(async (_req, res) => {
    res.json(await source.excelAgentStatus());
  }));
  router.post("/notifications/test", asyncHandler(async (_req, res) => {
    res.json(await source.testNotification(res.locals.user?.id));
  }));
  return router;
}
