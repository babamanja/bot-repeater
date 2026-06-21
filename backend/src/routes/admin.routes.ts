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
router.get("/ai-usage", asyncHandler(adminController.getAiUsage));
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
router.get("/user-pairs", asyncHandler(adminController.listUserPairs));

export default router;
