import type { Request, Response } from "express";

import { randomUUID } from "node:crypto";

import { applyTextLengthPolicy } from "../config/generationUploadProfile.js";
import * as fileService from "../services/file.service.js";
import * as pdfOcrJobService from "../services/pdfOcrJob.service.js";
import { resolveUploadProfileForUser } from "../services/uploadProfile.service.js";
import { getQueryString, getRouteParam } from "../utils/routeParams.js";
import {
  getRequiredUserId,
  sendServiceFailure,
  sendUnauthorized,
} from "./helpers.js";

function getRequestId(req: { id?: unknown; headers?: Record<string, unknown> }): string {
  return (
    (typeof req.id === "string" && req.id) ||
    (typeof req.headers?.["x-request-id"] === "string" &&
      req.headers["x-request-id"]) ||
    randomUUID()
  );
}

function getUserId(req: Request): number | null {
  return getRequiredUserId(req);
}

function applyTextPolicyToAnalyzeResult<T extends { assembledText: string }>(
  result: T,
  profile: Awaited<ReturnType<typeof resolveUploadProfileForUser>>,
):
  | { ok: true; result: T & { textTruncated?: boolean } }
  | { ok: false; status: number; error: string } {
  const applied = applyTextLengthPolicy(result.assembledText, profile);
  if (applied.ok === false) {
    return { ok: false, status: 413, error: applied.error };
  }
  return {
    ok: true,
    result: {
      ...result,
      assembledText: applied.text,
      textTruncated: applied.truncated,
    },
  };
}

export async function extractUploadText(req: Request, res: Response) {
  const userId = getUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }

  const requestId = getRequestId(req);
  if (!req.file) {
    return res.status(400).json({ error: "file_required" });
  }
  const uploadProfile = await resolveUploadProfileForUser(
    userId,
    getQueryString(req, "uploadProfile") || undefined,
  );
  const result = await fileService.extractTextFromUpload(req.file, {
    requestId,
    maxBytes: uploadProfile.maxBytes,
    userId,
    uploadProfile,
  });
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.status(200).json(result.result);
}

export async function analyzePdfUpload(req: Request, res: Response) {
  const userId = getUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }

  const requestId = getRequestId(req);
  if (!req.file) {
    return res.status(400).json({ error: "file_required" });
  }
  const uploadProfile = await resolveUploadProfileForUser(
    userId,
    getQueryString(req, "uploadProfile") || undefined,
  );
  const result = await pdfOcrJobService.analyzePdfUpload(userId, req.file, {
    requestId,
    maxBytes: uploadProfile.maxBytes,
    uploadProfile,
  });
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }

  if (result.result.status === "page_selection_required") {
    return res.status(200).json(result.result);
  }

  const withTextPolicy = applyTextPolicyToAnalyzeResult(
    result.result,
    uploadProfile,
  );
  if (withTextPolicy.ok === false) {
    return res.status(withTextPolicy.status).json({ error: withTextPolicy.error });
  }

  return res.status(200).json(withTextPolicy.result);
}

export async function getPdfOcrJob(req: Request, res: Response) {
  const userId = getUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }

  const result = await pdfOcrJobService.getPdfOcrJobForUser(getRouteParam(req, "id"), userId);
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.status(200).json(result.result);
}

export async function startPdfOcrJob(req: Request, res: Response) {
  const userId = getUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }

  const result = await pdfOcrJobService.startPdfOcrJob(getRouteParam(req, "id"), userId);
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.status(200).json(result.result);
}

export async function cancelPdfOcrJob(req: Request, res: Response) {
  const userId = getUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }

  const result = await pdfOcrJobService.cancelPdfOcrJob(getRouteParam(req, "id"), userId);
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.status(200).json(result.result);
}

export async function selectPdfOcrPages(req: Request, res: Response) {
  const userId = getUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }

  const uploadProfile = await resolveUploadProfileForUser(
    userId,
    getQueryString(req, "uploadProfile") || undefined,
  );
  const maxSelectablePages = uploadProfile.maxSelectablePages ?? 10;
  const pageIndices = req.body?.pageIndices;
  if (!Array.isArray(pageIndices)) {
    return res.status(400).json({ error: "invalid_page_selection" });
  }

  const result = await pdfOcrJobService.selectPdfOcrPages(
    getRouteParam(req, "id"),
    userId,
    pageIndices.map((value) => Number(value)),
    maxSelectablePages,
  );
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }

  const withTextPolicy = applyTextPolicyToAnalyzeResult(
    { assembledText: result.result.assembledText },
    uploadProfile,
  );
  if (withTextPolicy.ok === false) {
    return res.status(withTextPolicy.status).json({ error: withTextPolicy.error });
  }

  return res.status(200).json({
    ...result.result,
    assembledText: withTextPolicy.result.assembledText,
    textTruncated: withTextPolicy.result.textTruncated,
  });
}
