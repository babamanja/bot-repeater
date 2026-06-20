import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as authController from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { authRateLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.use(authRateLimiter);

router.post("/guest", asyncHandler(authController.createGuest));
router.post("/signup/password", asyncHandler(authController.signUpWithPassword));
router.post("/login/password", asyncHandler(authController.logInWithPassword));
router.post("/login/google", asyncHandler(authController.logInWithGoogle));
router.post("/account/restore", asyncHandler(authController.restoreDeletedAccount));
router.post("/password/forgot", asyncHandler(authController.forgotPassword));
router.post("/password/reset", asyncHandler(authController.resetPassword));
router.post("/email/verify", asyncHandler(authController.verifyEmail));
router.post("/email/resend", requireAuth, asyncHandler(authController.resendVerificationEmail));
router.post("/refresh", asyncHandler(authController.refresh));
router.post("/logout", asyncHandler(authController.logout));
router.get("/me", requireAuth, asyncHandler(authController.me));

export default router;
