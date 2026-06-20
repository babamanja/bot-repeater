import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as adminController from "../controllers/admin.controller.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = Router();

router.use(requireAdmin);
router.get("/users", asyncHandler(adminController.listUsers));
router.get("/users/:userId", asyncHandler(adminController.getUserDetails));
router.post("/users/:userId/tokens/adjust", asyncHandler(adminController.adjustUserTokens));
router.post(
  "/users/:userId/subscription/grant-premium",
  asyncHandler(adminController.grantPremiumSubscription),
);
router.get("/payments", asyncHandler(adminController.listPayments));
router.post("/payments/:paymentId/refund", asyncHandler(adminController.refundPayment));
router.get("/prompt-template", asyncHandler(adminController.getPromptTemplate));
router.put("/prompt-template", asyncHandler(adminController.updatePromptTemplate));
router.post("/prompt-template/reset", asyncHandler(adminController.resetPromptTemplate));
router.get(
  "/chunk-summary-prompt-template",
  asyncHandler(adminController.getChunkSummaryPromptTemplate),
);
router.put(
  "/chunk-summary-prompt-template",
  asyncHandler(adminController.updateChunkSummaryPromptTemplate),
);
router.post(
  "/chunk-summary-prompt-template/reset",
  asyncHandler(adminController.resetChunkSummaryPromptTemplate),
);
router.get("/generation-settings", asyncHandler(adminController.getGenerationSettings));
router.put("/generation-settings", asyncHandler(adminController.updateGenerationSettings));
router.post(
  "/generation-settings/reset",
  asyncHandler(adminController.resetGenerationSettings),
);
router.get("/token-analytics", asyncHandler(adminController.getTokenAnalytics));
router.get("/qualification-template", asyncHandler(adminController.getQualificationTemplate));
router.put(
  "/qualification-template",
  asyncHandler(adminController.updateQualificationTemplate),
);
router.get(
  "/qualification-submissions",
  asyncHandler(adminController.listQualificationSubmissions),
);
router.get("/feedback", asyncHandler(adminController.listFeedback));
router.get("/quizzes", asyncHandler(adminController.listQuizzes));

export default router;
