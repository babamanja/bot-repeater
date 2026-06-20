import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as attemptController from "../controllers/attempt.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.get("/list", requireAuth, asyncHandler(attemptController.listAttemptsByUser));
router.get(
  "/:attemptId/results",
  requireAuth,
  asyncHandler(attemptController.getAttemptById),
);

export default router;
