#!/usr/bin/env node
import { createReadStream, createWriteStream } from "node:fs";
import { readFile, mkdir, stat, copyFile, rename, rm, symlink, lstat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cachedAsset } from "./asset-cache.mjs";
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
  for await (const chunk of createReadStream(file, {highWaterMark: 8 * 1024 * 1024})) digest.update(chunk);
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
async function linkAsset(file,target){
  await mkdir(path.dirname(file),{recursive:true});
  try{const s=await lstat(file);if(s.isSymbolicLink())await rm(file);else throw Error(`Refusing to replace regular asset unexpectedly: ${file}`);}catch(e){if(e.code!=="ENOENT")throw e;}
  await symlink(target,file);
}
if (!["verify", "install", "publish", "cache"].includes(command))
  throw Error("Usage: node scripts/ocr-assets.mjs verify|install|publish|cache");
if (command === "publish" && !nasRoot)
  throw Error("Set CUBE_NAS_ROOT to the mounted NAS cube-light directory.");
for (const asset of manifest.assets) {
  const file = path.join(publicRoot, asset.path);
  if (asset.storage === "nas" && (command === "cache" || command === "install")) {
    const target=cachedAsset(asset);
    if(await valid(file,asset)) {
      if(!(await valid(target,asset))){await mkdir(path.dirname(target),{recursive:true});await copyFile(file,target);if(!(await valid(target,asset)))throw Error("Cache verification failed");}
      await rm(file,{force:true});await linkAsset(file,target);continue;
    }
    if(await valid(target,asset)){await linkAsset(file,target);continue;}
    if(command==="cache")throw Error(`Cannot cache missing asset: ${asset.path}`);
  }
  if(command==="cache")continue;
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
    command === "publish" ? path.join(nasRoot, relative) : (asset.storage === "nas" ? cachedAsset(asset) : file);
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
    if(command==="install" && asset.storage==="nas")await linkAsset(file,destination);
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
