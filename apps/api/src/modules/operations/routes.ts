import { Router } from "express";
import { operationSchema } from "@coa-bot/validation";
import { DataSource } from "../../repositories/data-source.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import { HttpError } from "../../errors/http-error.js";

export function operationRoutes(source: DataSource) {
  const router = Router();
  router.get("/", asyncHandler(async (_req, res) => { res.json(await source.listOperations()); }));
  router.post("/", asyncHandler(async (req, res) => {
    const input = operationSchema.safeParse(req.body);
    if (!input.success) throw new HttpError(400, "Operacao invalida.", input.error.issues);
    res.status(201).json(await source.createOperation(input.data, res.locals.user?.id));
  }));
  router.patch("/:id", asyncHandler(async (req, res) => {
    res.json(await source.updateOperation(String(req.params.id), req.body, res.locals.user?.id));
  }));
  router.delete("/:id", asyncHandler(async (req, res) => {
    res.json(await source.deleteOperation(String(req.params.id), res.locals.user?.id));
  }));
  return router;
}
