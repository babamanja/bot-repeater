import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import multer from "multer";
import * as fileController from "../controllers/file.controller.js";
import { UPLOAD_MAX_BYTES_ABSOLUTE } from "../config/uploadLimits.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { uploadRateLimiter } from "../middleware/rateLimit.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_MAX_BYTES_ABSOLUTE },
});

router.post(
  "/pdf/extract",
  requireAuth,
  uploadRateLimiter,
  upload.single("file"),
  asyncHandler(fileController.extractUploadText),
);

router.post(
  "/pdf/analyze",
  requireAuth,
  uploadRateLimiter,
  upload.single("file"),
  asyncHandler(fileController.analyzePdfUpload),
);

router.get(
  "/pdf/ocr-jobs/:id",
  requireAuth,
  asyncHandler(fileController.getPdfOcrJob),
);

router.post(
  "/pdf/ocr-jobs/:id/start",
  requireAuth,
  asyncHandler(fileController.startPdfOcrJob),
);

router.post(
  "/pdf/ocr-jobs/:id/cancel",
  requireAuth,
  asyncHandler(fileController.cancelPdfOcrJob),
);

router.post(
  "/pdf/ocr-jobs/:id/select-pages",
  requireAuth,
  asyncHandler(fileController.selectPdfOcrPages),
);

export default router;
