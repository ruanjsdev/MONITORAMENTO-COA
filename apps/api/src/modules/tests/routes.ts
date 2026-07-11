import { Router } from "express";
import { DataSource } from "../../repositories/data-source.js";
import { asyncHandler } from "../../middleware/async-handler.js";

export function testRoutes(source: DataSource) {
  const router = Router();
  router.get("/", asyncHandler(async (_req, res) => { res.json(await source.listTestExecutions()); }));
  router.post("/run", asyncHandler(async (req, res) => {
    res.json(await source.runTest({
      type: String(req.body.action ?? req.body.type ?? "preview"),
      userId: res.locals.user?.id,
      operation: String(req.body.operation ?? "Plantio Mecanizado"),
      groupName: String(req.body.group ?? req.body.groupName ?? "COA Simulado"),
      shift: String(req.body.shift ?? "C"),
      legend: req.body.legend
    }));
  }));
  return router;
}
