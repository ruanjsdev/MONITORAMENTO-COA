import { Router } from "express";
import jwt from "jsonwebtoken";
import { changePasswordSchema, loginSchema } from "@coa-bot/validation";
import { DataSource } from "../../repositories/data-source.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import { authMiddleware } from "../../middleware/auth.js";
import { HttpError } from "../../errors/http-error.js";

export function authRoutes(source: DataSource, jwtSecret: string) {
  const router = Router();
  const auth = authMiddleware(jwtSecret, source.validateSession.bind(source));

  router.post("/login", asyncHandler(async (req, res) => {
    const input = loginSchema.safeParse(req.body);
    if (!input.success) throw new HttpError(400, "Entrada invalida.", input.error.issues);
    const result = await source.login(input.data.email, input.data.password, req.ip);
    const token = jwt.sign(result.user, jwtSecret, {
      expiresIn: Number(process.env.SESSION_TTL_HOURS ?? 12) * 60 * 60,
      jwtid: result.tokenId
    });
    res.json({ token, user: result.user, simulationMode: source.simulationMode });
  }));

  router.post("/logout", auth, asyncHandler(async (req, res) => {
    const token = req.headers.authorization?.slice(7);
    const decoded = token ? jwt.decode(token, { complete: true }) : null;
    await source.logout(String(decoded?.payload && typeof decoded.payload === "object" ? decoded.payload.jti ?? "" : ""), res.locals.user?.id);
    res.json({ ok: true });
  }));

  router.post("/change-password", auth, asyncHandler(async (req, res) => {
    const input = changePasswordSchema.safeParse(req.body);
    if (!input.success) throw new HttpError(400, "Entrada invalida.", input.error.issues);
    await source.changePassword(res.locals.user!.id, input.data.currentPassword, input.data.newPassword);
    res.json({ ok: true });
  }));

  return router;
}
