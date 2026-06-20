export type QuizLanguageOption = {
    code: string;
    promptLabel: string;
};
export declare const QUIZ_LANGUAGES: readonly QuizLanguageOption[];
export declare const QUIZ_LANGUAGE_CODES: readonly string[];
export type QuizLanguageCode = (typeof QUIZ_LANGUAGES)[number]["code"];
export declare const DEFAULT_QUIZ_LANGUAGE_CODE = "en";
export declare function isQuizLanguageCode(value: string): value is QuizLanguageCode;
export declare function resolveQuizLanguage(value: unknown): {
    code: string;
    promptLabel: string;
} | null;
export declare function resolveQuizLanguageOrDefault(value: unknown): QuizLanguageOption;
//# sourceMappingURL=quizLanguages.d.ts.map