import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LANDING_UPLOAD_PROFILE } from "../../../config/generationUploadProfile";
import { usePdfOcrFlow } from "./usePdfOcrFlow";

vi.mock("../../../api/file", () => ({
  analyzePdfUpload: vi.fn(),
  cancelPdfOcrJob: vi.fn(),
  extractUploadText: vi.fn(),
  getPdfOcrJob: vi.fn(),
  selectPdfOcrPages: vi.fn(),
  startPdfOcrJob: vi.fn(),
}));

vi.mock("../../../api/tokens", () => ({
  refreshMyTokenBalance: vi.fn().mockResolvedValue(100),
}));

function createDeps() {
  const setBusyAction = vi.fn();
  const setError = vi.fn();
  const setRequiredTokens = vi.fn();
  const setTokenBalance = vi.fn();
  const onUploadTokenError = vi.fn();
  const onTextExtracted = vi.fn();

  return {
    setBusyAction,
    setError,
    options: {
      t: ((key: string) => key) as never,
      uploadProfile: LANDING_UPLOAD_PROFILE,
      setBusyAction,
      setError,
      setRequiredTokens,
      setTokenBalance,
      onUploadTokenError,
      onTextExtracted,
    },
  };
}

describe("usePdfOcrFlow", () => {
  it("starts with empty upload state", () => {
    const { options } = createDeps();
    const { result } = renderHook(() => usePdfOcrFlow(options));

    expect(result.current.files).toEqual([]);
    expect(result.current.extractNotice).toBeNull();
    expect(result.current.pendingOcrFile).toBeNull();
    expect(result.current.activePdfOcrJob).toBeNull();
    expect(result.current.pendingPageSelection).toBeNull();
  });

  it("queues image upload for OCR confirmation", async () => {
    const { options, setError } = createDeps();
    const { result } = renderHook(() => usePdfOcrFlow(options));
    const file = new File(["img"], "photo.png", { type: "image/png" });

    await act(async () => {
      await result.current.handleFileChange(file);
    });

    expect(result.current.pendingOcrFile).toBe(file);
    expect(setError).toHaveBeenCalledWith(null);
  });
});
