export { UPLOAD_MAX_BYTES_ABSOLUTE, UPLOAD_MAX_BYTES_BASIC, UPLOAD_MAX_BYTES_PREMIUM, UPLOAD_MAX_TEXT_CHARS_BASIC, UPLOAD_MAX_TEXT_CHARS_PREMIUM, } from "@vocab-bot/shared/uploadLimits";
import { UPLOAD_MAX_BYTES_BASIC, UPLOAD_MAX_BYTES_PREMIUM, UPLOAD_MAX_TEXT_CHARS_BASIC, UPLOAD_MAX_TEXT_CHARS_PREMIUM, } from "@vocab-bot/shared/uploadLimits";
export function getUploadMaxBytesForPlan(planCode) {
    return planCode === "premium" ? UPLOAD_MAX_BYTES_PREMIUM : UPLOAD_MAX_BYTES_BASIC;
}
export function getUploadMaxTextCharsForPlan(planCode) {
    return planCode === "premium" ? UPLOAD_MAX_TEXT_CHARS_PREMIUM : UPLOAD_MAX_TEXT_CHARS_BASIC;
}
