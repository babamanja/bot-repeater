import type { Request, Response } from "express";

import * as dictionaryService from "../services/dictionary.service.js";
import * as userService from "../services/user.service.js";
import * as vocabService from "../services/vocab.service.js";
import {
  getRequiredUserId,
  sendServiceFailure,
  sendUnauthorized,
} from "./helpers.js";

function extractRequestId(req: Request): string | undefined {
  const header = req.headers?.["x-request-id"];
  if (typeof header === "string" && header.trim()) {
    return header.trim();
  }
  if (Array.isArray(header) && header.length > 0 && typeof header[0] === "string") {
    const candidate = header[0].trim();
    return candidate || undefined;
  }
  return undefined;
}

export async function createUserDeprecated(_req: Request, res: Response) {
  return res.status(410).json({
    error:
      "POST /api/users is deprecated. Use authenticated endpoints GET /api/users/me and PATCH /api/users/me.",
  });
}

export async function getCurrentUser(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const result = await userService.getCurrentUser(userId);
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.status(200).json(result.user);
}

export async function listLanguageOptions(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const result = await userService.listLanguageOptions();
  return res.status(200).json(result.languages);
}

export async function updateCurrentUser(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const result = await userService.updateCurrentUser(userId, req.body ?? {});
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.status(200).json(result.user);
}

export async function listMyWords(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const page = Math.max(1, Number(req.query?.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query?.pageSize) || 20));
  const sortByRaw =
    typeof req.query?.sortBy === "string" ? req.query.sortBy : "nextReviewMs";
  const sortBy = ["nextReviewMs", "pimsleurLevel", "primaryWord"].includes(sortByRaw)
    ? (sortByRaw as "nextReviewMs" | "pimsleurLevel" | "primaryWord")
    : "nextReviewMs";
  const sortOrderRaw =
    typeof req.query?.sortOrder === "string" ? req.query.sortOrder.toLowerCase() : "desc";
  const sortOrder = sortOrderRaw === "asc" ? "asc" : "desc";
  const searchRaw = typeof req.query?.search === "string" ? req.query.search.trim() : "";
  const search = searchRaw.length > 0 ? searchRaw : undefined;

  const result = await userService.listMyWords(userId, {
    page,
    pageSize,
    sortBy,
    sortOrder,
    search,
  });
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.status(200).json({ items: result.items, pagination: result.pagination });
}

export async function getVocabLanguages(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const result = await vocabService.getVocabLanguages(userId);
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.status(200).json(result.languages);
}

export async function lookupPrimaryWord(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const primaryWord =
    typeof req.body?.primaryWord === "string" ? req.body.primaryWord : "";
  const result = await vocabService.lookupPrimaryWord(userId, primaryWord);
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.status(200).json({
    primaryWordId: result.primaryWordId,
    primaryText: result.primaryText,
    suggestions: result.suggestions,
    learningLangName: result.learningLangName,
  });
}

export async function addMyWord(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const body = req.body ?? {};
  const result = await vocabService.addWordForUser(userId, {
    vocabPairId: typeof body.vocabPairId === "number" ? body.vocabPairId : undefined,
    primaryWordId: typeof body.primaryWordId === "number" ? body.primaryWordId : undefined,
    learningWord: typeof body.learningWord === "string" ? body.learningWord : undefined,
  });
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.status(201).json(result.word);
}

export async function listMyDictionaries(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const result = await dictionaryService.listMyDictionaries(userId);
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.status(200).json({ items: result.items });
}

export async function getDashboardStats(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const result = await userService.getUserDashboardStats(userId);
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.status(200).json(result.stats);
}

export async function deleteCurrentUser(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const result = await userService.deleteCurrentUser(userId, extractRequestId(req));
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.status(204).send();
}
