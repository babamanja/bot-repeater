import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

type PdfJsAssetUrls = {
  standardFontDataUrl: string;
  cMapUrl: string;
};

let runtimeReady = false;
let pdfJsAssetUrls: PdfJsAssetUrls | null = null;

function installPdfRuntimeGlobals(): void {
  try {
    const canvas = require("@napi-rs/canvas") as {
      DOMMatrix?: unknown;
      ImageData?: unknown;
      Path2D?: unknown;
    };
    if (typeof globalThis.DOMMatrix === "undefined" && canvas.DOMMatrix) {
      globalThis.DOMMatrix = canvas.DOMMatrix as typeof DOMMatrix;
    }
    if (typeof globalThis.ImageData === "undefined" && canvas.ImageData) {
      globalThis.ImageData = canvas.ImageData as typeof ImageData;
    }
    if (typeof globalThis.Path2D === "undefined" && canvas.Path2D) {
      globalThis.Path2D = canvas.Path2D as typeof Path2D;
    }
  } catch {
    // @napi-rs/canvas not installed — pdf.js text extraction may still work
  }
}

// Must run before pdfjs-dist is imported (worker or main bundle).
installPdfRuntimeGlobals();

function resolvePdfJsAssetDir(...segments: string[]): string {
  const pkgDir = path.dirname(require.resolve("pdfjs-dist/package.json"));
  return `${pathToFileURL(path.join(pkgDir, ...segments)).href}/`;
}

export function getPdfJsDocumentInitOptions(): PdfJsAssetUrls & {
  cMapPacked: true;
  useSystemFonts: false;
} {
  if (!pdfJsAssetUrls) {
    pdfJsAssetUrls = {
      standardFontDataUrl: resolvePdfJsAssetDir("standard_fonts"),
      cMapUrl: resolvePdfJsAssetDir("cmaps"),
    };
  }
  return {
    ...pdfJsAssetUrls,
    cMapPacked: true,
    useSystemFonts: false,
  };
}

export async function ensurePdfRuntime(): Promise<void> {
  if (runtimeReady) {
    return;
  }
  runtimeReady = true;
  installPdfRuntimeGlobals();
}
