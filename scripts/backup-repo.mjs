#!/usr/bin/env node
import { mkdir, writeFile, stat, realpath, readFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = await realpath(fileURLToPath(new URL("../", import.meta.url))),
  nas = process.env.CUBE_NAS_ROOT;
if (!nas)
  throw Error("Set CUBE_NAS_ROOT to the mounted NAS cube-light directory.");
await mkdir(nas, { recursive: true });
const resolved = await realpath(nas);
if (
  resolved === root ||
  resolved.startsWith(root + path.sep) ||
  resolved === path.parse(resolved).root
)
  throw Error(
    "NAS backup destination must be outside the repository and cannot be a filesystem root.",
  );
const stamp = new Date().toISOString().replace(/[:.]/g, "-"),
  destination = path.join(resolved, "repository", stamp);
await mkdir(destination, { recursive: true });
async function run(command, args) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: ["ignore", "pipe", "inherit"],
    });
    let output = "";
    child.stdout.on("data", (d) => (output += d));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve(output.trim())
        : reject(Error(`${command} exited ${code}`)),
    );
  });
}
const commit = await run("git", ["rev-parse", "HEAD"]),
  status = await run("git", ["status", "--porcelain"]);
await run("git", [
  "bundle",
  "create",
  path.join(destination, "history.bundle"),
  "--all",
]);
await run("git", [
  "bundle",
  "verify",
  path.join(destination, "history.bundle"),
]);
console.log(
  "Archiving the complete working repository, including ignored files and .git…",
);
const archive = path.join(destination, "working-repository.tar");
await run("tar", ["-cf", archive, "-C", root, "."]);
const digest = createHash("sha256");
for await (const chunk of createReadStream(archive)) digest.update(chunk);
const report = {
  created: new Date().toISOString(),
  commit,
  dirty: !!status,
  gitStatus: status,
  archive: "working-repository.tar",
  bytes: (await stat(archive)).size,
  sha256: digest.digest("hex"),
  includes:
    "Entire working directory including .git, node_modules, models, private fixtures, ignored files and data",
};
await writeFile(
  path.join(destination, "backup.json"),
  JSON.stringify(report, null, 2) + "\n",
);
// Keep a transactionally consistent copy of the mutable app database as well.
const database = path.join(root, "projects/server/database.sqlite");
try {
  await stat(database);
  const { DatabaseSync, backup } = await import("node:sqlite"),
    db = new DatabaseSync(database, { readOnly: true });
  try {
    await backup(db, path.join(destination, "application-database.sqlite"));
  } finally {
    db.close();
  }
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
await writeFile(
  path.join(resolved, "repository", "latest.json"),
  JSON.stringify({ directory: stamp, ...report }, null, 2) + "\n",
);
console.log("Verified NAS backup:", destination, report.sha256);
