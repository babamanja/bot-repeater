import { getPromptTemplate } from "./promptTemplateStore.js";

export function buildPromptGenerate(
  text: string,
  language: string,
  count: number,
): string {
  return getPromptTemplate()
    .replaceAll("{{language}}", language)
    .replaceAll("{{count}}", String(count))
    .replaceAll("{{text}}", text);
}
