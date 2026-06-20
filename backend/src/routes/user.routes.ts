import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as userController from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.post("/", asyncHandler(userController.createUserDeprecated));
router.get("/me", requireAuth, asyncHandler(userController.getCurrentUser));
router.get("/me/dashboard-stats", requireAuth, asyncHandler(userController.getDashboardStats));
router.patch("/me", requireAuth, asyncHandler(userController.updateCurrentUser));
router.delete("/me", requireAuth, asyncHandler(userController.deleteCurrentUser));

export default router;
