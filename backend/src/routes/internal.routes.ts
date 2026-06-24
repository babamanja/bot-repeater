import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireInternalApiKey } from "../middleware/requireInternalApiKey.js";
import * as internalController from "../controllers/internal.controller.js";

const router = Router();

router.use(requireInternalApiKey);

router.post("/telegram/ensure-user", asyncHandler(internalController.ensureTelegramUser));
router.post(
  "/telegram/stars-payment",
  asyncHandler(internalController.recordTelegramStarsPayment),
);
router.post(
  "/telegram/link-code",
  asyncHandler(internalController.createTelegramLinkCode),
);
router.post(
  "/telegram/complete-link",
  asyncHandler(internalController.completeTelegramLink),
);

export default router;
