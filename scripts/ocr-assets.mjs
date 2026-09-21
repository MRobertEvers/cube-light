#!/usr/bin/env node
import { createReadStream, createWriteStream } from "node:fs";
import { readFile, mkdir, stat, copyFile, rename, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const manifest = JSON.parse(
  await readFile(path.join(root, "deploy/ocr-assets.json"), "utf8"),
);
const command = process.argv[2] || "verify",
  nasRoot = process.env.CUBE_NAS_ROOT,
  nasUrl = process.env.CUBE_NAS_URL;
const publicRoot = path.join(root, "projects/clientv2/public/ocr");
async function hash(file) {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  return digest.digest("hex");
}
async function valid(file, asset) {
  try {
    return (
      (await stat(file)).size === asset.bytes &&
      (await hash(file)) === asset.sha256
    );
  } catch {
    return false;
  }
}
if (!["verify", "install", "publish"].includes(command))
  throw Error("Usage: node scripts/ocr-assets.mjs verify|install|publish");
if (command === "publish" && !nasRoot)
  throw Error("Set CUBE_NAS_ROOT to the mounted NAS cube-light directory.");
for (const asset of manifest.assets) {
  const file = path.join(publicRoot, asset.path);
  if (command === "verify") {
    if (!(await valid(file, asset)))
      throw Error(
        `Missing or corrupt OCR asset: ${asset.path}. Run npm run install:ocr with CUBE_NAS_ROOT or CUBE_NAS_URL.`,
      );
    continue;
  }
  if (command === "install" && (await valid(file, asset))) continue;
  if (command === "install" && asset.storage === "git")
    throw Error(
      `Git-tracked asset missing/corrupt: ${asset.path}; restore it from Git.`,
    );
  const relative = path.join("models", manifest.version, asset.path);
  const destination =
    command === "publish" ? path.join(nasRoot, relative) : file;
  if (command === "publish") {
    if (!(await valid(file, asset)))
      throw Error(`Source asset failed verification: ${asset.path}`);
    if (await valid(destination, asset)) continue;
  }
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = destination + ".download-" + process.pid;
  try {
    if (command === "publish") await copyFile(file, temporary);
    else if (nasRoot) await copyFile(path.join(nasRoot, relative), temporary);
    else if (nasUrl) {
      const base = new URL(nasUrl.endsWith("/") ? nasUrl : nasUrl + "/");
      if (base.username || base.password)
        throw Error(
          "Use an authenticated mount instead of credentials in a URL.",
        );
      const url = new URL(relative.split(path.sep).join("/"), base),
        response = await fetch(url);
      if (!response.ok)
        throw Error(`NAS download failed: ${response.status} ${asset.path}`);
      await pipeline(
        Readable.fromWeb(response.body),
        createWriteStream(temporary),
      );
    } else
      throw Error(
        `Large asset ${asset.path} needs CUBE_NAS_ROOT (mounted path) or CUBE_NAS_URL (NAS HTTP base URL).`,
      );
    if (!(await valid(temporary, asset)))
      throw Error(`Checksum mismatch: ${asset.path}`);
    await rename(temporary, destination);
    console.log(command, asset.path);
  } finally {
    await rm(temporary, { force: true });
  }
}
if (command === "publish") {
  const folder = path.join(nasRoot, "models", manifest.version);
  await mkdir(folder, { recursive: true });
  await copyFile(
    path.join(root, "deploy/ocr-assets.json"),
    path.join(folder, "manifest.json"),
  );
}
console.log(`OCR assets ${command} complete: ${manifest.version}`);
