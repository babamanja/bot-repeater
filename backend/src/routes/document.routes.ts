import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as documentController from "../controllers/document.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { uploadRateLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.get("/", requireAuth, asyncHandler(documentController.list));
router.post("/", requireAuth, uploadRateLimiter, asyncHandler(documentController.create));
router.get(
  "/:documentId/generation-preview",
  requireAuth,
  asyncHandler(documentController.getGenerationPreview),
);
router.get("/:documentId", requireAuth, asyncHandler(documentController.getById));
router.delete("/:documentId", requireAuth, asyncHandler(documentController.remove));

export default router;
