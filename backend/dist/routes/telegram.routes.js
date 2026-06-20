import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/requireAuth.js";
import * as telegramController from "../controllers/telegram.controller.js";
const router = Router();
router.post("/link-code", requireAuth, asyncHandler(telegramController.createMyTelegramLinkCode));
export default router;
