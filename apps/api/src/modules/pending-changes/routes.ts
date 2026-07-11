import { Router } from "express";
import { pendingChangeDecisionSchema, simulatedMessageSchema } from "@coa-bot/validation";
import { DataSource } from "../../repositories/data-source.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import { HttpError } from "../../errors/http-error.js";

export function pendingChangeRoutes(source: DataSource) {
  const router = Router();
  router.get("/", asyncHandler(async (_req, res) => { res.json(await source.listPendingChanges()); }));
  router.post("/:id/decision", asyncHandler(async (req, res) => {
    const input = pendingChangeDecisionSchema.safeParse(req.body);
    if (!input.success) throw new HttpError(400, "Decisao invalida.", input.error.issues);
    res.json(await source.decidePendingChange(String(req.params.id), input.data.decision, input.data.description, res.locals.user?.id));
  }));
  router.post("/simulate-message", asyncHandler(async (req, res) => {
    const input = simulatedMessageSchema.safeParse(req.body);
    if (!input.success) throw new HttpError(400, "Mensagem invalida.", input.error.issues);
    res.status(201).json(await source.simulateMessage(input.data, res.locals.user?.id));
  }));
  return router;
}
