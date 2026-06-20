import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const controllersDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/controllers",
);

for (const file of fs.readdirSync(controllersDir)) {
  if (!file.endsWith(".ts") || file === "helpers.ts") {
    continue;
  }

  const filePath = path.join(controllersDir, file);
  let content = fs.readFileSync(filePath, "utf8");

  if (!content.includes('from "express"')) {
    content = 'import type { Request, Response } from "express";\n\n' + content;
  }

  content = content.replace(
    /\b(export async function \w+\()(_req|req), res\)/g,
    "$1$2: Request, res: Response)",
  );
  content = content.replace(
    /\b(export function \w+\()(_req|req), res\)/g,
    "$1$2: Request, res: Response)",
  );
  content = content.replace(
    /\b(function \w+\()(_req|req), res\)/g,
    "$1$2: Request, res: Response)",
  );
  content = content.replace(/\bfunction (\w+)\(res\)/g, "function $1(res: Response)");
  content = content.replace(
    /\bfunction (\w+)\((req|_req)\)/g,
    "function $1($2: Request)",
  );

  fs.writeFileSync(filePath, content);
}

console.log("Controller types updated.");
