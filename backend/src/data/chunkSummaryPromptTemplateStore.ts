import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const TEMPLATE_FILE_PATH = resolve(
  process.cwd(),
  "data",
  "ai-chunk-summary-prompt-template.txt",
);

const DEFAULT_PROMPT_TEMPLATE = [
  "Summarize the document chunk below for later quiz generation.",
  "",
  "Rules:",
  "- Return a single JSON object only (no markdown fences, no extra text).",
  '- Keys: "title" (short section heading, max {{titleMaxChars}} characters) and "summary" (plain text, max {{maxChars}} characters).',
  "- Preserve key facts, definitions, names, and structure in the summary.",
  "- Write title and summary in {{language}}.",
  "",
  "CHUNK_TEXT:",
  "{{text}}",
].join("\n");

let currentTemplate = readTemplateFromDisk();

function readTemplateFromDisk(): string {
  try {
    if (!existsSync(TEMPLATE_FILE_PATH)) {
      return DEFAULT_PROMPT_TEMPLATE;
    }
    const content = readFileSync(TEMPLATE_FILE_PATH, "utf8").trim();
    return content || DEFAULT_PROMPT_TEMPLATE;
  } catch {
    return DEFAULT_PROMPT_TEMPLATE;
  }
}

function persistTemplate(template: string): void {
  const templateDir = dirname(TEMPLATE_FILE_PATH);
  if (!existsSync(templateDir)) {
    mkdirSync(templateDir, { recursive: true });
  }
  writeFileSync(TEMPLATE_FILE_PATH, template, "utf8");
}

export function getChunkSummaryPromptTemplate(): string {
  return currentTemplate;
}

export function getDefaultChunkSummaryPromptTemplate(): string {
  return DEFAULT_PROMPT_TEMPLATE;
}

export function updateChunkSummaryPromptTemplate(template: string): string {
  const normalized = template.trim();
  if (!normalized) {
    throw new Error("Prompt template cannot be empty");
  }
  if (!normalized.includes("{{text}}")) {
    throw new Error('Prompt template must include "{{text}}" placeholder');
  }

  currentTemplate = normalized;
  persistTemplate(normalized);
  return currentTemplate;
}

export function resetChunkSummaryPromptTemplate(): string {
  currentTemplate = DEFAULT_PROMPT_TEMPLATE;
  persistTemplate(DEFAULT_PROMPT_TEMPLATE);
  return currentTemplate;
}
