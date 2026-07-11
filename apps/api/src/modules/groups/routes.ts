import { Router } from "express";
import { groupSchema } from "@coa-bot/validation";
import { DataSource } from "../../repositories/data-source.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import { HttpError } from "../../errors/http-error.js";

export function groupRoutes(source: DataSource) {
  const router = Router();
  router.get("/", asyncHandler(async (_req, res) => { res.json(await source.listGroups()); }));
  router.post("/", asyncHandler(async (req, res) => {
    const input = groupSchema.safeParse(req.body);
    if (!input.success) throw new HttpError(400, "Grupo invalido.", input.error.issues);
    res.status(201).json(await source.createGroup(input.data, res.locals.user?.id));
  }));
  router.patch("/:id", asyncHandler(async (req, res) => {
    res.json(await source.updateGroup(String(req.params.id), req.body, res.locals.user?.id));
  }));
  router.delete("/:id", asyncHandler(async (req, res) => {
    res.json(await source.deleteGroup(String(req.params.id), res.locals.user?.id));
  }));
  router.post("/:id/test", asyncHandler(async (req, res) => {
    res.json(await source.testGroup(String(req.params.id), res.locals.user?.id));
  }));
  return router;
}
