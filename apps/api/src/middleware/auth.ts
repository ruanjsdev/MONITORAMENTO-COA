import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  roles: string[];
  mustChangePassword?: boolean;
};

declare global {
  namespace Express {
    interface Locals {
      user?: AuthenticatedUser;
    }
  }
}

export function authMiddleware(jwtSecret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Sessao obrigatoria." });
      return;
    }
    try {
      res.locals.user = jwt.verify(header.slice(7), jwtSecret) as AuthenticatedUser;
      next();
    } catch {
      res.status(401).json({ error: "Sessao invalida ou expirada." });
    }
  };
}
