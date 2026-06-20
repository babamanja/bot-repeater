export const QUIZ_LANGUAGES = [
    { code: "en", promptLabel: "English" },
    { code: "ru", promptLabel: "Russian" },
    { code: "uk", promptLabel: "Ukrainian" },
    { code: "de", promptLabel: "German" },
    { code: "fr", promptLabel: "French" },
    { code: "es", promptLabel: "Spanish" },
    { code: "pt", promptLabel: "Portuguese" },
    { code: "pl", promptLabel: "Polish" },
    { code: "it", promptLabel: "Italian" },
    { code: "tr", promptLabel: "Turkish" },
    { code: "zh", promptLabel: "Chinese" },
    { code: "ja", promptLabel: "Japanese" },
    { code: "ko", promptLabel: "Korean" },
    { code: "ar", promptLabel: "Arabic" },
];
export const QUIZ_LANGUAGE_CODES = QUIZ_LANGUAGES.map((item) => item.code);
export const DEFAULT_QUIZ_LANGUAGE_CODE = "en";
const languageByCode = new Map(QUIZ_LANGUAGES.map((item) => [item.code, item]));
export function isQuizLanguageCode(value) {
    return languageByCode.has(value);
}
export function resolveQuizLanguage(value) {
    if (typeof value !== "string") {
        return null;
    }
    const normalized = value.trim().toLowerCase();
    const match = languageByCode.get(normalized);
    return match ?? null;
}
export function resolveQuizLanguageOrDefault(value) {
    return resolveQuizLanguage(value) ?? languageByCode.get(DEFAULT_QUIZ_LANGUAGE_CODE);
}
