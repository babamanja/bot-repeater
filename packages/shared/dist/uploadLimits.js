export const UPLOAD_MAX_BYTES_BASIC = 5 * 1024 * 1024;
export const UPLOAD_MAX_BYTES_PREMIUM = 25 * 1024 * 1024;
export const UPLOAD_MAX_TEXT_CHARS_BASIC = 15_000;
export const UPLOAD_MAX_TEXT_CHARS_PREMIUM = 1_000_000;
/** Upper bound for multer buffering — matches premium plan limit. */
export const UPLOAD_MAX_BYTES_ABSOLUTE = UPLOAD_MAX_BYTES_PREMIUM;
