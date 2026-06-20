import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as feedbackController from "../controllers/feedback.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { feedbackRateLimiter } from "../middleware/rateLimit.js";
const router = Router();
router.post("/", requireAuth, feedbackRateLimiter, asyncHandler(feedbackController.submitFeedback));
export default router;
