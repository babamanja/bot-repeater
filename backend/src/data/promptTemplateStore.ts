import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const TEMPLATE_FILE_PATH = resolve(
  process.cwd(),
  "data",
  "ai-prompt-template.txt",
);

const DEFAULT_PROMPT_TEMPLATE = [
  "Generate a quiz in {{language}} from the USER_TEXT below.",
  "Output must be strictly one valid JSON object and nothing else.",
  "Do not use markdown, code fences, code comments, or extra keys.",
  "",
  "Required output JSON schema:",
  "{",
  '  "title": "string",',
  '  "questions": [',
  "    {",
  '      "id": "string",',
  '      "prompt": "string",',
  '      "correctAnswerIds": ["uuid"],',
  '      "options": [',
  '        { "answerId": "uuid", "text": "string" },',
  '        { "answerId": "uuid", "text": "string" },',
  '        { "answerId": "uuid", "text": "string" },',
  '        { "answerId": "uuid", "text": "string" }',
  "      ]",
  "    }",
  "  ]",
  "}",
  "",
  "Hard constraints:",
  "- Return exactly {{count}} questions.",
  "- Every question must have exactly 4 options.",
  "- option.answerId must be UUID and unique within each question.",
  "- correctAnswerIds must contain one or more option.answerId values.",
  "- question.id values must be UUID and unique.",
  "- title and prompts should be concise and clear.",
  "- Use the same language as USER_TEXT ({{language}}).",
  "",
  "If USER_TEXT is too short, still return valid JSON with a generic educational quiz.",
  "",
  "USER_TEXT:",
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

export function getPromptTemplate(): string {
  return currentTemplate;
}

export function getDefaultPromptTemplate(): string {
  return DEFAULT_PROMPT_TEMPLATE;
}

export function updatePromptTemplate(template: string): string {
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

export function resetPromptTemplate(): string {
  currentTemplate = DEFAULT_PROMPT_TEMPLATE;
  persistTemplate(DEFAULT_PROMPT_TEMPLATE);
  return currentTemplate;
}
