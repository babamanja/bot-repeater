import type { NextFunction, Request, Response } from "express";

import type { AuthUser } from "./auth.js";

export type { AuthUser };

export type AuthenticatedRequest = Request & { user: AuthUser };

export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

export type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;
