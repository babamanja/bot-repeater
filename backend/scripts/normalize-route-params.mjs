import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const controllersDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/controllers",
);

const paramPattern = /req\.params\.([A-Za-z0-9_]+)/g;

for (const file of fs.readdirSync(controllersDir)) {
  if (!file.endsWith(".ts")) {
    continue;
  }

  const filePath = path.join(controllersDir, file);
  let content = fs.readFileSync(filePath, "utf8");
  if (!paramPattern.test(content)) {
    continue;
  }
  paramPattern.lastIndex = 0;

  if (!content.includes("getRouteParam")) {
    content = content.replace(
      /(import type \{ Request, Response \} from "express";\n\n)/,
      '$1import { getRouteParam } from "../utils/routeParams.js";\n',
    );
  }

  content = content.replace(paramPattern, 'getRouteParam(req, "$1")');
  fs.writeFileSync(filePath, content);
}

console.log("Route params normalized.");
