import { getPromptTemplate } from "./promptTemplateStore.js";
export function buildPromptGenerate(text, language, count) {
    return getPromptTemplate()
        .replaceAll("{{language}}", language)
        .replaceAll("{{count}}", String(count))
        .replaceAll("{{text}}", text);
}
