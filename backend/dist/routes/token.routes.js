import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as tokenController from "../controllers/token.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";
const router = Router();
router.get("/me", requireAuth, asyncHandler(tokenController.getMyTokenBalance));
router.post("/purchase", requireAuth, asyncHandler(tokenController.purchaseMyTokens));
export default router;
