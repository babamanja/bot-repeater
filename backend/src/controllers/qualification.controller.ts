import type { Request, Response } from "express";

import * as qualificationService from "../services/qualification.service.js";
import {
  getRequiredUserId,
  getUserRole,
  sendServiceFailure,
  sendUnauthorized,
} from "./helpers.js";

export async function getMyQualification(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const result = await qualificationService.getMyQualificationState(
    userId,
    getUserRole(req),
  );
  return res.status(200).json(result);
}

export async function submitMyQualification(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const result = await qualificationService.submitMyQualification(
    userId,
    getUserRole(req),
    req.body ?? {},
  );
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.status(201).json({ ok: true });
}

export async function skipMyQualification(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const result = await qualificationService.skipMyQualification(
    userId,
    getUserRole(req),
  );
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.status(201).json({ ok: true });
}

export async function getQualificationTemplate(_req: Request, res: Response) {
  const result = await qualificationService.getQualificationTemplate();
  return res.status(200).json({
    questions: result.questions,
    defaultQuestions: result.defaultQuestions,
  });
}

export async function updateQualificationTemplate(req: Request, res: Response) {
  try {
    const result = await qualificationService.updateQualificationTemplate(
      req.body ?? {},
    );
    return res.status(200).json({ questions: result.questions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "invalid questionnaire";
    return res.status(400).json({ error: message });
  }
}

export async function listQualificationSubmissions(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query?.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query?.pageSize) || 20));
  const searchRaw =
    typeof req.query?.search === "string" ? req.query.search.trim() : "";
  const search = searchRaw.length > 0 ? searchRaw : undefined;
  const statusRaw =
    typeof req.query?.status === "string" ? req.query.status : "";
  const status =
    statusRaw === "completed" || statusRaw === "skipped" ? statusRaw : undefined;

  const result = await qualificationService.listQualificationSubmissionsForAdmin({
    page,
    pageSize,
    search,
    status,
  });

  return res.status(200).json({
    items: result.items,
    pagination: result.pagination,
  });
}
