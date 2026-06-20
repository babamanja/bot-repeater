import {
  LANDING_UPLOAD_PROFILE,
  buildAppUploadProfile,
  parseUploadProfileKey,
  type GenerationUploadProfile,
} from "../config/generationUploadProfile.js";
import type { SubscriptionPlanCode } from "../db/subscriptionRepository.js";
import { getEffectivePlanCodeForUser } from "./subscriptionPlan.service.js";
import * as userRepository from "../db/userRepository.js";

export async function resolveUploadProfileForUser(
  userId: number,
  profileKeyRaw: unknown,
): Promise<GenerationUploadProfile> {
  const profileKey = parseUploadProfileKey(profileKeyRaw);
  if (profileKey === "landing") {
    return LANDING_UPLOAD_PROFILE;
  }

  const user = await userRepository.selectUserById(userId);
  if (user?.is_guest) {
    return LANDING_UPLOAD_PROFILE;
  }

  const planCode: SubscriptionPlanCode = await getEffectivePlanCodeForUser(userId);
  return buildAppUploadProfile(planCode);
}
