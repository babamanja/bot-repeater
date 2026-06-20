import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as quizController from "../controllers/quiz.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { generationSettingsRateLimiter, quizGenerateRateLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.get("/list", requireAuth, asyncHandler(quizController.listByCreator));
router.post(
  "/generation-settings",
  generationSettingsRateLimiter,
  asyncHandler(quizController.getGenerationSettings),
);
router.post("/generate", quizGenerateRateLimiter, requireAuth, asyncHandler(quizController.generate));
router.post("/:quizId/regenerate", requireAuth, asyncHandler(quizController.regenerate));
router.post("/:quizId/refund-tokens", requireAuth, asyncHandler(quizController.refundTokens));
router.get("/:quizId/results", requireAuth, asyncHandler(quizController.getResults));
router.post("/:quizId/landing/claim", requireAuth, asyncHandler(quizController.claimLandingQuiz));
router.post("/:quizId/accept", requireAuth, asyncHandler(quizController.acceptQuiz));
router.put("/:quizId", requireAuth, asyncHandler(quizController.updateQuiz));
router.delete("/:quizId", requireAuth, asyncHandler(quizController.deleteQuiz));
router.get("/:quizId", asyncHandler(quizController.getQuizById));
router.get("/:quizId/full", requireAuth, asyncHandler(quizController.getFullQuizDataById));

export default router;
