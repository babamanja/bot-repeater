import { spawnSync } from "node:child_process";

function run(label, args) {
  console.log(`[vercel-build] ${label}`);
  const result = spawnSync("npm", args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// Backend must be compiled before api/index.ts runs on Vercel.
run("shared", ["run", "build", "-w", "@vocab-bot/shared"]);
run("backend", ["run", "build", "-w", "vocab-bot-backend"]);
run("db:deploy", ["run", "db:deploy", "-w", "vocab-bot-backend"]);

// Frontend is built by @vercel/static-build (see vercel.json builds).
