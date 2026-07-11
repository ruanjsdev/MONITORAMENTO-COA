import { Router } from "express";
import { DataSource } from "../../repositories/data-source.js";
import { asyncHandler } from "../../middleware/async-handler.js";

export function logRoutes(source: DataSource) {
  const router = Router();
  router.get("/", asyncHandler(async (_req, res) => { res.json(await source.logs()); }));
  return router;
}
