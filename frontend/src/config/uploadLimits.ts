export {
  UPLOAD_MAX_BYTES_BASIC,
  UPLOAD_MAX_BYTES_PREMIUM,
  UPLOAD_MAX_TEXT_CHARS_BASIC,
  UPLOAD_MAX_TEXT_CHARS_PREMIUM,
} from "@vocab-bot/shared/uploadLimits";

import {
  UPLOAD_MAX_BYTES_BASIC,
  UPLOAD_MAX_BYTES_PREMIUM,
  UPLOAD_MAX_TEXT_CHARS_BASIC,
  UPLOAD_MAX_TEXT_CHARS_PREMIUM,
} from "@vocab-bot/shared/uploadLimits";

export function getUploadMaxBytes(isPremium: boolean): number {
  return isPremium ? UPLOAD_MAX_BYTES_PREMIUM : UPLOAD_MAX_BYTES_BASIC;
}

export function getUploadMaxMegabytes(isPremium: boolean): number {
  return getUploadMaxBytes(isPremium) / (1024 * 1024);
}

export function getUploadMaxTextChars(isPremium: boolean): number {
  return isPremium ? UPLOAD_MAX_TEXT_CHARS_PREMIUM : UPLOAD_MAX_TEXT_CHARS_BASIC;
}

export function clampTextToMaxChars(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  return text.slice(0, maxChars);
}
