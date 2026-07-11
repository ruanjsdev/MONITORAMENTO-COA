import { Router } from "express";
import { DataSource } from "../../repositories/data-source.js";
import { asyncHandler } from "../../middleware/async-handler.js";

export function spreadsheetRoutes(source: DataSource) {
  const router = Router();
  router.get("/", asyncHandler(async (_req, res) => { res.json(await source.spreadsheets()); }));
  router.post("/reanalyze", asyncHandler(async (_req, res) => {
    res.json(await source.reanalyzeSpreadsheets(res.locals.user?.id));
  }));
  return router;
}
