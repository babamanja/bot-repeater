export { PDF_OCR_MAX_PAGES } from "@vocab-bot/shared/pdfOcrLimits";

/** Pages processed sequentially per chain step (one HTTP / in-process tick). */
export const PDF_OCR_PAGES_PER_STEP = 3;

/** PNG render scale for OCR (higher = better quality, larger payload). */
export const PDF_OCR_RENDER_SCALE = 2;
