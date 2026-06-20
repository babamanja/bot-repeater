import type { Request, Response } from "express";

import { getRouteParam } from "../utils/routeParams.js";
import * as documentService from "../services/document.service.js";
import {
  getRequiredUserId,
  sendServiceFailure,
  sendUnauthorized,
} from "./helpers.js";

export async function create(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const result = await documentService.createDocument(userId, req.body ?? {});
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.status(201).json({
    document: result.document,
    chunks: result.chunks,
    tokensChargedSummarization: result.tokensChargedSummarization,
  });
}

export async function list(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const result = await documentService.listDocuments(userId);
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.json(result.documents);
}

export async function getById(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const result = await documentService.getDocumentById(getRouteParam(req, "documentId"), userId);
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.json({
    document: result.document,
    chunks: result.chunks,
  });
}

export async function remove(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const result = await documentService.deleteDocument(getRouteParam(req, "documentId"), userId);
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.status(204).send();
}

export async function getGenerationPreview(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }
  const result = await documentService.getDocumentGenerationPreview(
    getRouteParam(req, "documentId"),
    userId,
    req.query?.chunkId,
    { questionCount: req.query?.questionCount },
  );
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.json(result);
}
