import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/requireAuth.js";
import * as telegramController from "../controllers/telegram.controller.js";

const router = Router();

router.get("/link", requireAuth, asyncHandler(telegramController.getMyTelegramLink));
router.post(
  "/link-code",
  requireAuth,
  asyncHandler(telegramController.createMyTelegramLinkCode),
);
router.delete("/link", requireAuth, asyncHandler(telegramController.unlinkMyTelegram));

export default router;
