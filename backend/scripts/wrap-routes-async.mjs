import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const routesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/routes",
);

const controllerRef = /([A-Za-z]+Controller\.\w+)/g;

for (const file of fs.readdirSync(routesDir)) {
  if (!file.endsWith(".ts")) {
    continue;
  }

  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, "utf8");

  if (!content.includes("asyncHandler")) {
    content = content.replace(
      /(import \{ Router \} from "express";)/,
      '$1\nimport { asyncHandler } from "../middleware/asyncHandler.js";',
    );
  }

  content = content.replace(controllerRef, (match) => {
    if (match.startsWith("asyncHandler(")) {
      return match;
    }
    return `asyncHandler(${match})`;
  });

  fs.writeFileSync(filePath, content);
}

console.log("Route asyncHandler wrappers added.");
