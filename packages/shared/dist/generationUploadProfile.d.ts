export type TextOverflowPolicy = "truncate" | "error";
export type PdfPageOverflowPolicy = "error" | "first_pages" | "user_select";
export type GenerationUploadProfileKey = "landing" | "app";
export type GenerationUploadProfile = {
    key: GenerationUploadProfileKey;
    maxBytes: number;
    maxTextChars: number;
    textOverflow: TextOverflowPolicy;
    /** Maximum pages allowed in an uploaded PDF. */
    maxPdfPages: number;
    pdfPageOverflow: PdfPageOverflowPolicy;
    /** Premium: max pages the user can pick for one quiz/OCR run. */
    maxSelectablePages?: number;
    ocrConfirmRequired: boolean;
};
/** Basic plan: books larger than this are rejected outright. */
export declare const APP_BASIC_MAX_PDF_PAGES = 30;
export declare const PREMIUM_MAX_SELECTABLE_PAGES = 10;
export declare const LANDING_UPLOAD_PROFILE: GenerationUploadProfile;
export declare function buildAppUploadProfileForPlan(isPremium: boolean): GenerationUploadProfile;
export declare function parseUploadProfileKey(value: unknown): GenerationUploadProfileKey | null;
export type ApplyTextLengthResult = {
    ok: true;
    text: string;
    truncated: boolean;
} | {
    ok: false;
    error: "TEXT_TOO_LONG";
    maxChars: number;
};
export declare function applyTextLengthPolicy(text: string, profile: GenerationUploadProfile): ApplyTextLengthResult;
export type ApplyPdfPagesResult = {
    ok: true;
    pages: Array<{
        pageIndex: number;
        text: string;
    }>;
    totalPages: number;
    truncated: boolean;
} | {
    ok: false;
    error: "pdf_too_many_pages";
    totalPages: number;
    maxPages: number;
};
export declare function applyPdfPagePolicy(pages: Array<{
    pageIndex: number;
    text: string;
}>, totalPages: number, profile: GenerationUploadProfile): ApplyPdfPagesResult;
export declare function buildPagePreview(text: string | null, maxChars?: number): string;
//# sourceMappingURL=generationUploadProfile.d.ts.map