export { APP_BASIC_MAX_PDF_PAGES, LANDING_UPLOAD_PROFILE, PREMIUM_MAX_SELECTABLE_PAGES, applyPdfPagePolicy, buildPagePreview, parseUploadProfileKey, } from "@vocab-bot/shared/generationUploadProfile";
import { applyTextLengthPolicy as applyTextLengthPolicyShared, buildAppUploadProfileForPlan, } from "@vocab-bot/shared/generationUploadProfile";
export function buildAppUploadProfile(planCode) {
    return buildAppUploadProfileForPlan(planCode === "premium");
}
export function applyTextLengthPolicy(text, profile) {
    const result = applyTextLengthPolicyShared(text, profile);
    if (result.ok === false) {
        return {
            ok: false,
            error: `TEXT_TOO_LONG:${result.maxChars}`,
            maxChars: result.maxChars,
        };
    }
    return result;
}
