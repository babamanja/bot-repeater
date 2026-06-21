import type { Request, Response } from "express";

import { getRouteParam } from "../utils/routeParams.js";
import * as adminService from "../services/admin.service.js";
import * as feedbackController from "./feedback.controller.js";
import * as qualificationController from "./qualification.controller.js";
import {
  getRequiredUserId,
  sendServiceFailure,
  sendUnauthorized,
} from "./helpers.js";

export async function listUsers(_req: Request, res: Response) {
  const page = Math.max(1, Number(_req.query?.page) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(_req.query?.pageSize) || 10),
  );
  const sortByRaw =
    typeof _req.query?.sortBy === "string" ? _req.query.sortBy : "id";
  const sortBy = ["id", "userName", "email", "role", "tokenBalance"].includes(
    sortByRaw,
  )
    ? (sortByRaw as "id" | "userName" | "email" | "role" | "tokenBalance")
    : "id";
  const sortOrderRaw =
    typeof _req.query?.sortOrder === "string"
      ? _req.query.sortOrder.toLowerCase()
      : "asc";
  const sortOrder = sortOrderRaw === "desc" ? "desc" : "asc";
  const roleRaw = typeof _req.query?.role === "string" ? _req.query.role : "";
  const role: "admin" | "user" | undefined =
    roleRaw === "admin" || roleRaw === "user" ? roleRaw : undefined;
  const searchRaw =
    typeof _req.query?.search === "string" ? _req.query.search.trim() : "";
  const search = searchRaw.length > 0 ? searchRaw : undefined;

  const result = await adminService.listUsers({
    page,
    pageSize,
    sortBy,
    sortOrder,
    role,
    search,
  });
  return res
    .status(200)
    .json({ items: result.users, pagination: result.pagination });
}

export async function getUserDetails(req: Request, res: Response) {
  const userId = Number(req.params?.userId);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ error: "invalid user id" });
  }
  const result = await adminService.getUserDetails(userId);
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.status(200).json(result.user);
}

export async function grantPremiumSubscription(req: Request, res: Response) {
  const userId = Number(req.params?.userId);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ error: "invalid user id" });
  }

  const result = await adminService.grantPremiumSubscriptionByAdmin({
    userId,
    currentPeriodEnd: req.body?.currentPeriodEnd,
  });

  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.status(200).json({ subscription: result.subscription });
}

export async function adjustUserTokens(req: Request, res: Response) {
  const userId = Number(req.params?.userId);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ error: "invalid user id" });
  }
  const adminUserId = getRequiredUserId(req);
  if (adminUserId === null) {
    return sendUnauthorized(res);
  }

  const result = await adminService.adjustUserTokensByAdmin({
    userId,
    adminUserId,
    delta: req.body?.delta,
    comment: req.body?.comment,
  });

  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.status(200).json({ balance: result.balance });
}

export async function listPayments(_req: Request, res: Response) {
  const page = Math.max(1, Number(_req.query?.page) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(_req.query?.pageSize) || 10),
  );
  const sortByRaw =
    typeof _req.query?.sortBy === "string" ? _req.query.sortBy : "date";
  const sortBy = ["date", "amount", "status", "transactionType"].includes(
    sortByRaw,
  )
    ? (sortByRaw as "date" | "amount" | "status" | "transactionType")
    : "date";
  const sortOrderRaw =
    typeof _req.query?.sortOrder === "string"
      ? _req.query.sortOrder.toLowerCase()
      : "desc";
  const sortOrder = sortOrderRaw === "asc" ? "asc" : "desc";
  const statusRaw =
    typeof _req.query?.status === "string" ? _req.query.status : "";
  const status =
    statusRaw === "pending" ||
    statusRaw === "succeeded" ||
    statusRaw === "failed" ||
    statusRaw === "refunded"
      ? statusRaw
      : undefined;
  const transactionTypeRaw =
    typeof _req.query?.transactionType === "string"
      ? _req.query.transactionType
      : "";
  const transactionType =
    transactionTypeRaw === "payment" || transactionTypeRaw === "refund"
      ? transactionTypeRaw
      : undefined;
  const searchRaw =
    typeof _req.query?.search === "string" ? _req.query.search.trim() : "";
  const search = searchRaw.length > 0 ? searchRaw : undefined;

  const result = await adminService.listPayments({
    page,
    pageSize,
    sortBy,
    sortOrder,
    status,
    transactionType,
    search,
  });
  return res
    .status(200)
    .json({ items: result.payments, pagination: result.pagination });
}

export async function refundPayment(req: Request, res: Response) {
  const paymentId = getRouteParam(req, "paymentId");
  const adminUserId = getRequiredUserId(req);
  if (adminUserId === null) {
    return sendUnauthorized(res);
  }

  const result = await adminService.refundPaymentByAdmin({
    paymentId,
    adminUserId,
    reason: req.body?.reason,
  });
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.status(200).json({
    originalPaymentId: result.originalPaymentId,
    refundPaymentId: result.refundPaymentId,
  });
}

export async function getAiUsage(req: Request, res: Response) {
  const result = await adminService.getAiUsage({
    days: req.query?.days,
    page: req.query?.page,
    pageSize: req.query?.pageSize,
    sortBy: req.query?.sortBy,
    sortOrder: req.query?.sortOrder,
    status: req.query?.status,
    userId: req.query?.userId,
    search: req.query?.search,
  });
  return res.status(200).json(result.usage);
}

export async function getQualificationTemplate(req: Request, res: Response) {
  return qualificationController.getQualificationTemplate(req, res);
}

export async function updateQualificationTemplate(req: Request, res: Response) {
  return qualificationController.updateQualificationTemplate(req, res);
}

export async function listQualificationSubmissions(req: Request, res: Response) {
  return qualificationController.listQualificationSubmissions(req, res);
}

export async function listFeedback(req: Request, res: Response) {
  return feedbackController.listFeedbackForAdmin(req, res);
}

export async function listUserPairs(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query?.page) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(req.query?.pageSize) || 20),
  );
  const sortByRaw =
    typeof req.query?.sortBy === "string" ? req.query.sortBy : "nextReviewMs";
  const sortBy = ["nextReviewMs", "pimsleurLevel"].includes(sortByRaw)
    ? (sortByRaw as "nextReviewMs" | "pimsleurLevel")
    : "nextReviewMs";
  const sortOrderRaw =
    typeof req.query?.sortOrder === "string"
      ? req.query.sortOrder.toLowerCase()
      : "desc";
  const sortOrder = sortOrderRaw === "asc" ? "asc" : "desc";
  const searchRaw =
    typeof req.query?.search === "string" ? req.query.search.trim() : "";
  const search = searchRaw.length > 0 ? searchRaw : undefined;

  const result = await adminService.listUserPairs({
    page,
    pageSize,
    sortBy,
    sortOrder,
    search,
  });
  return res
    .status(200)
    .json({ items: result.userPairs, pagination: result.pagination });
}
