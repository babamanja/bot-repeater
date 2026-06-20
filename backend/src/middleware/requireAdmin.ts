import type { NextFunction, Request, Response } from "express";

import { requireAuth } from "./requireAuth.js";

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  return requireAuth(req, res, () => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "forbidden" });
    }
    return next();
  });
}
