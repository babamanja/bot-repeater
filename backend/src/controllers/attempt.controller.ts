import type { Request, Response } from "express";

import { getRouteParam } from "../utils/routeParams.js";
import * as attemptService from "../services/attempt.service.js";
import {
  getRequiredUserId,
  sendServiceFailure,
  sendUnauthorized,
} from "./helpers.js";
import { isUuid } from "../utils/uuid.js";

export async function listAttemptsByUser(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const search = typeof req.query?.search === "string" ? req.query.search : undefined;
  const sortRaw = typeof req.query?.sort === "string" ? req.query.sort : undefined;
  const scoreRaw = typeof req.query?.score === "string" ? req.query.score : undefined;
  const sort =
    sortRaw === "newest" ||
    sortRaw === "oldest" ||
    sortRaw === "score_desc" ||
    sortRaw === "score_asc"
      ? sortRaw
      : "newest";
  const score =
    scoreRaw === "all" || scoreRaw === "pass" || scoreRaw === "fail"
      ? scoreRaw
      : "all";
  const result = await attemptService.listAttemptsByUser(userId, {
    search,
    sort,
    score,
  });
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.json(result.attempts);
}

export async function getAttemptById(req: Request, res: Response) {
  const attemptId = getRouteParam(req, "attemptId");
  if (!isUuid(attemptId)) {
    return res.status(400).json({ error: "invalid attemptId" });
  }
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const result = await attemptService.getAttemptById(attemptId, userId);
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.json(result.attempt);
}
