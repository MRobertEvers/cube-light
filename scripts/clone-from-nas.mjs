#!/usr/bin/env node
// Copy this standalone script to a new machine to install code and models from the NAS.
import { readFile, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
const nas = process.env.CUBE_NAS_ROOT,
  destination = process.argv[2];
if (!nas || !destination)
  throw Error(
    "Usage: CUBE_NAS_ROOT=/mounted/share/cube-light node clone-from-nas.mjs /new/checkout",
  );
try {
  await stat(destination);
  throw Error("Destination already exists; choose a new checkout directory.");
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const latest = JSON.parse(
  await readFile(path.join(nas, "repository/latest.json"), "utf8"),
);
if (!/^[0-9TZ-]+$/.test(latest.directory))
  throw Error("Invalid NAS snapshot directory.");
const bundle = path.join(nas, "repository", latest.directory, "history.bundle");
async function run(command, args, cwd) {
  await new Promise((resolve, reject) => {
    const p = spawn(command, args, { cwd, stdio: "inherit", env: process.env });
    p.on("error", reject);
    p.on("exit", (c) =>
      c === 0 ? resolve() : reject(Error(`${command} exited ${c}`)),
    );
  });
}
await run("git", ["clone", bundle, path.resolve(destination)]);
await run("git", ["checkout", latest.commit], path.resolve(destination));
await run(process.execPath, ["scripts/install.mjs"], path.resolve(destination));
console.log("Code and models restored from NAS:", path.resolve(destination));
