import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as authController from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  authSensitiveRateLimiter,
  authSessionRateLimiter,
} from "../middleware/rateLimit.js";

const router = Router();

router.post("/guest", authSessionRateLimiter, asyncHandler(authController.createGuest));
router.post("/refresh", authSessionRateLimiter, asyncHandler(authController.refresh));
router.post("/logout", authSessionRateLimiter, asyncHandler(authController.logout));
router.get("/me", requireAuth, asyncHandler(authController.me));

router.post(
  "/signup/password",
  authSensitiveRateLimiter,
  asyncHandler(authController.signUpWithPassword),
);
router.post(
  "/login/password",
  authSensitiveRateLimiter,
  asyncHandler(authController.logInWithPassword),
);
router.post(
  "/login/google",
  authSensitiveRateLimiter,
  asyncHandler(authController.logInWithGoogle),
);
router.post(
  "/account/restore",
  authSensitiveRateLimiter,
  asyncHandler(authController.restoreDeletedAccount),
);
router.post(
  "/password/forgot",
  authSensitiveRateLimiter,
  asyncHandler(authController.forgotPassword),
);
router.post(
  "/password/reset",
  authSensitiveRateLimiter,
  asyncHandler(authController.resetPassword),
);
router.post(
  "/email/verify",
  authSensitiveRateLimiter,
  asyncHandler(authController.verifyEmail),
);
router.post(
  "/email/resend",
  requireAuth,
  authSensitiveRateLimiter,
  asyncHandler(authController.resendVerificationEmail),
);

export default router;
