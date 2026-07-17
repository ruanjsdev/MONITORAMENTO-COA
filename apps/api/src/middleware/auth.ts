import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import type { UserSession } from "@coa-bot/shared";

export type AuthenticatedUser = UserSession & {
  mustChangePassword?: boolean;
};

declare global {
  namespace Express {
    interface Locals {
      user?: AuthenticatedUser;
    }
  }
}

export type SessionValidator = (tokenId: string, claimed: AuthenticatedUser) => Promise<AuthenticatedUser | null>;

export function authMiddleware(jwtSecret: string, validateSession: SessionValidator) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Sessao obrigatoria." });
      return;
    }
    try {
      const decoded = jwt.verify(header.slice(7), jwtSecret);
      if (typeof decoded === "string") throw new Error("Payload JWT inválido.");
      const tokenId = (decoded as JwtPayload).jti;
      if (!tokenId) throw new Error("Sessão sem identificador.");
      const user = await validateSession(tokenId, decoded as AuthenticatedUser);
      if (!user) throw new Error("Sessão revogada, expirada ou usuário inativo.");
      res.locals.user = user;
      next();
    } catch {
      res.status(401).json({ error: "Sessao invalida ou expirada." });
    }
  };
}
