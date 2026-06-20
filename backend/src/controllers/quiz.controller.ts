import type { Request, Response } from "express";

import { getRouteParam } from "../utils/routeParams.js";
import * as quizService from "../services/quiz.service.js";
import * as landingQuizClaimService from "../services/landingQuizClaim.service.js";
import {
  getRequiredUserId,
  sendServiceFailure,
  sendUnauthorized,
} from "./helpers.js";
import { isString } from "../utils/typecheck.js";
import { isUuid } from "../utils/uuid.js";

export async function listByCreator(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const result = await quizService.listQuizzesByCreator(userId);
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.json(result.quizzes);
}

export async function generate(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const body = req.body ?? {};
  const documentId =
    typeof body.documentId === "string" ? body.documentId.trim() : "";
  const result = documentId
    ? await quizService.generateQuizFromDocument(documentId, userId, {
        chunkId: body.chunkId,
        questionCount: body.questionCount,
        language: body.language,
      })
    : await quizService.generateQuiz(body.text, userId, {
        questionCount: body.questionCount,
        language: body.language,
      });
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  const batch =
    "quizzes" in result && Array.isArray(result.quizzes) && result.quizzes.length > 0
      ? result.quizzes
      : null;
  return res.status(202).json({
    id: result.quizId,
    status: result.status,
    tokensCharged: result.tokensCharged,
    totalTokensCharged:
      "totalTokensCharged" in result ? result.totalTokensCharged : result.tokensCharged,
    questionCount: result.questionCount,
    language: result.language,
    documentId: result.documentId ?? undefined,
    chunkId: result.chunkId ?? undefined,
    ...(batch
      ? {
          quizzes: batch.map((quiz) => ({
            id: quiz.quizId,
            chunkId: quiz.chunkId,
            tokensCharged: quiz.tokensCharged,
            questionCount: quiz.questionCount,
            status: result.status,
          })),
        }
      : {}),
  });
}

export async function getGenerationSettings(req: Request, res: Response) {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const text = isString(body.text) ? body.text : "";
  const questionCountRaw = body.questionCount;
  const questionCount =
    questionCountRaw === undefined || questionCountRaw === ""
      ? undefined
      : Number(questionCountRaw);
  const result = await quizService.getQuizGenerationSettingsPreview(text, {
    questionCount,
  });
  return res.status(200).json(result);
}

export async function claimLandingQuiz(req: Request, res: Response) {
  const quizId = getRouteParam(req, "quizId");
  if (!isUuid(quizId)) {
    return res.status(400).json({ error: "invalid quizId" });
  }
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const result = await landingQuizClaimService.claimLandingQuiz(
    quizId,
    req.body ?? {},
    userId,
  );
  if (result.ok === false) {
    return sendServiceFailure(
      res,
      result,
      "redirectTo" in result && result.redirectTo
        ? { redirectTo: result.redirectTo }
        : undefined,
    );
  }
  return res
    .status(201)
    .json({ acceptedAt: result.acceptedAt, attemptId: result.attemptId });
}

export async function acceptQuiz(req: Request, res: Response) {
  const quizId = getRouteParam(req, "quizId");
  if (!isUuid(quizId)) {
    return res.status(400).json({ error: "invalid quizId" });
  }
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const result = await quizService.acceptQuiz(quizId, req.body ?? {}, userId);
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res
    .status(201)
    .json({ acceptedAt: result.acceptedAt, attemptId: result.attemptId });
}

export async function getResults(req: Request, res: Response) {
  const quizId = getRouteParam(req, "quizId");
  if (!isUuid(quizId)) {
    return res.status(400).json({ error: "invalid quizId" });
  }
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const result = await quizService.getStoredQuizResults(quizId, userId);
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.json({
    quiz: result.quiz,
    quizVersion: result.quizVersion,
    answers: result.answers,
    acceptedAt: result.acceptedAt,
    score: result.score,
    attemptId: result.attemptId,
    userId: result.userId,
  });
}

export async function getQuizById(req: Request, res: Response) {
  const quizId = getRouteParam(req, "quizId");
  if (!isUuid(quizId)) {
    return res.status(400).json({ error: "invalid quizId" });
  }
  const result = await quizService.getCuttedQuizById(quizId);
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.json(result.quiz);
}

export async function getFullQuizDataById(req: Request, res: Response) {
  const quizId = getRouteParam(req, "quizId");
  if (!isUuid(quizId)) {
    return res.status(400).json({ error: "invalid quizId" });
  }
  const result = await quizService.getFullQuizById(quizId);
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.json(result.quiz);
}

export async function updateQuiz(req: Request, res: Response) {
  const quizId = getRouteParam(req, "quizId");
  if (!isUuid(quizId)) {
    return res.status(400).json({ error: "invalid quizId" });
  }
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const result = await quizService.updateQuiz(quizId, req.body ?? {}, userId);
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.json({ ok: true, version: result.version });
}

export async function regenerate(req: Request, res: Response) {
  const quizId = getRouteParam(req, "quizId");
  if (!isUuid(quizId)) {
    return res.status(400).json({ error: "invalid quizId" });
  }
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const result = await quizService.regenerateQuiz(quizId, userId);
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.status(202).json({
    id: result.quizId,
    status: result.status,
    tokensCharged: result.tokensCharged,
    questionCount: result.questionCount,
    language: result.language,
  });
}

export async function refundTokens(req: Request, res: Response) {
  const quizId = getRouteParam(req, "quizId");
  if (!isUuid(quizId)) {
    return res.status(400).json({ error: "invalid quizId" });
  }
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const result = await quizService.refundQuizGenerationTokens(quizId, userId);
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.status(200).json({ tokensRefunded: result.tokensRefunded });
}

export async function deleteQuiz(req: Request, res: Response) {
  const quizId = getRouteParam(req, "quizId");
  if (!isUuid(quizId)) {
    return res.status(400).json({ error: "invalid quizId" });
  }
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const result = await quizService.deleteQuiz(quizId, userId);
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.status(204).send();
}
