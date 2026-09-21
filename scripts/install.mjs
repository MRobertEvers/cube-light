#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
async function run(command, args, cwd = root) {
  await new Promise((resolve, reject) => {
    const p = spawn(command, args, { cwd, stdio: "inherit", env: process.env });
    p.on("error", reject);
    p.on("exit", (c) =>
      c === 0 ? resolve() : reject(Error(`${command} exited ${c}`)),
    );
  });
}
if (Number(process.versions.node.split(".")[0]) < 24)
  throw Error("Node.js 24+ is required by the server.");
await run(
  "npm",
  ["ci", "--ignore-scripts"],
  fileURLToPath(new URL("../projects/clientv2/", import.meta.url)),
);
await run(process.execPath, ["scripts/ocr-assets.mjs", "install"]);
await run(
  "npm",
  ["run", "typecheck"],
  fileURLToPath(new URL("../projects/clientv2/", import.meta.url)),
);
await run(
  "npm",
  ["run", "build"],
  fileURLToPath(new URL("../projects/clientv2/", import.meta.url)),
);
console.log(
  "Client v2 installed and built. See deploy/README.md for server prerequisites and serving the release.",
);
