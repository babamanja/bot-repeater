import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { QuizGenerationSettingsPreview } from "../api/quiz";
import { useQuestionCountField } from "./useQuestionCountField";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const generationSettings: QuizGenerationSettingsPreview["settings"] = {
  tokensPerChar: 0.01,
  tokensPerQuestion: 10,
  questionsPerChunk: 5,
  chunkSizeChars: 4000,
  chunkOverlapChars: 200,
  tokensPerChunkSummary: 50,
  tokensPerOcrImage: 100,
  minQuestions: 3,
  maxQuestions: 10,
  defaultQuestions: 5,
};

describe("useQuestionCountField", () => {
  it("syncs suggested count when settings become available", () => {
    const { result } = renderHook(() =>
      useQuestionCountField({
        generationSettings,
        suggestedCount: 5,
      }),
    );

    expect(result.current.questionCountInput).toBe("5");
    expect(result.current.isValid).toBe(true);
    expect(result.current.effectiveQuestionCount).toBe(5);
  });

  it("rejects values below minQuestions after blur", () => {
    const { result } = renderHook(() =>
      useQuestionCountField({
        generationSettings,
        suggestedCount: 5,
      }),
    );

    act(() => {
      result.current.handleChange("2");
      result.current.handleBlur();
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.validationKey).toBe("tooLow");
    expect(result.current.errorMessage).toBe("upload.questionCountRange");
  });

  it("rejects values above maxQuestions", () => {
    const { result } = renderHook(() =>
      useQuestionCountField({
        generationSettings,
        suggestedCount: 5,
      }),
    );

    act(() => {
      result.current.handleChange("99");
      result.current.handleBlur();
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.validationKey).toBe("tooHigh");
  });

  it("ignores non-digit input", () => {
    const { result } = renderHook(() =>
      useQuestionCountField({
        generationSettings,
        suggestedCount: 5,
      }),
    );

    act(() => {
      result.current.handleChange("abc");
    });

    expect(result.current.questionCountInput).toBe("5");
  });

  it("reset clears touched state and input", () => {
    const { result } = renderHook(() =>
      useQuestionCountField({
        generationSettings,
        suggestedCount: 5,
      }),
    );

    act(() => {
      result.current.handleChange("7");
      result.current.markTouched();
      result.current.reset();
    });

    expect(result.current.questionCountInput).toBe("");
    expect(result.current.committedQuestionCount).toBeNull();
  });
});
