import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as userController from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.post("/", asyncHandler(userController.createUserDeprecated));
router.get("/me", requireAuth, asyncHandler(userController.getCurrentUser));
router.get("/me/language-options", requireAuth, asyncHandler(userController.listLanguageOptions));
router.get("/me/dashboard-stats", requireAuth, asyncHandler(userController.getDashboardStats));
router.get("/me/dictionaries", requireAuth, asyncHandler(userController.listMyDictionaries));
router.get("/me/words", requireAuth, asyncHandler(userController.listMyWords));
router.get("/me/vocab-languages", requireAuth, asyncHandler(userController.getVocabLanguages));
router.post("/me/words/lookup-primary", requireAuth, asyncHandler(userController.lookupPrimaryWord));
router.post("/me/words", requireAuth, asyncHandler(userController.addMyWord));
router.patch("/me", requireAuth, asyncHandler(userController.updateCurrentUser));
router.delete("/me", requireAuth, asyncHandler(userController.deleteCurrentUser));

export default router;
