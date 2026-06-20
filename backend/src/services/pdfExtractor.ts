import { getPdfJsDocumentInitOptions } from "./pdfRuntime.js";
import "pdfjs-dist/legacy/build/pdf.worker.mjs";

export type PdfExtractResult = {
  text: string;
  pages: number;
};

export type PdfPageText = {
  pageIndex: number;
  text: string;
};

export async function extractPdfPageTexts(buffer: Buffer): Promise<{
  pages: PdfPageText[];
  totalPages: number;
}> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: Uint8Array.from(buffer),
    ...getPdfJsDocumentInitOptions(),
  });
  const pdf = await loadingTask.promise;
  try {
    const pages: PdfPageText[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => {
          if ("str" in item && typeof item.str === "string") {
            return item.str;
          }
          return "";
        })
        .filter(Boolean)
        .join(" ")
        .trim();
      pages.push({
        pageIndex: pageNumber - 1,
        text: pageText,
      });
    }
    return {
      pages,
      totalPages: pdf.numPages,
    };
  } finally {
    await loadingTask.destroy();
  }
}

export async function extractTextWithPdfJs(buffer: Buffer): Promise<PdfExtractResult> {
  const parsed = await extractPdfPageTexts(buffer);
  const chunks = parsed.pages
    .map((page) => page.text)
    .filter(Boolean);
  return {
    text: chunks.join("\n").trim(),
    pages: parsed.totalPages,
  };
}
