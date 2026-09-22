#!/usr/bin/env node
import { mkdir, copyFile, writeFile, access, cp, readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { retainClientAssets } from "./retain-client-assets.mjs";
import { constants } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
if (process.platform !== "darwin")
  throw Error(
    "This launcher installs a macOS user LaunchAgent. Use deploy/serve-client.mjs with your service manager elsewhere.",
  );
const root = fileURLToPath(new URL("../", import.meta.url)),
  label = "local.cube-light.client",
  domain = `gui/${process.getuid()}`,
  support = path.join(homedir(), "Library/Application Support/CubeLight"),
  logs = path.join(homedir(), "Library/Logs/CubeLight");
async function run(command, args, optional = false) {
  return await new Promise((resolve, reject) => {
    const p = spawn(command, args, {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "",
      error = "";
    p.stdout.on("data", (d) => (output += d));
    p.stderr.on("data", (d) => (error += d));
    p.on("error", reject);
    p.on("close", (c) =>
      c === 0 || optional
        ? resolve(output.trim())
        : reject(Error(`${command}: ${error}`)),
    );
  });
}
await access(path.join(root, "projects/clientv2/dist/index.html"));
await run(process.execPath, ["scripts/ocr-assets.mjs", "verify"]);
await mkdir(support, { recursive: true });
await mkdir(logs, { recursive: true });
const runtime = process.env.CUBE_NODE_EXECUTABLE || process.execPath;
const release = path.join(
  support,
  "releases",
  new Date().toISOString().replace(/[:.]/g, "-"),
);
await mkdir(release, { recursive: true });
await cp(
  path.join(root, "projects/clientv2/dist"),
  path.join(release, "dist"),
  { recursive: true, mode: constants.COPYFILE_FICLONE },
);
// Publish before switching the service so already-open tabs retain every lazy chunk.
const retainedAssets = path.join(support, "client-assets");
for (const entry of await readdir(path.join(support, "releases"), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const source = path.join(support, "releases", entry.name, "dist/assets");
  try {
    await access(source);
  } catch (error) {
    if (error.code === "ENOENT") continue;
    throw error;
  }
  await retainClientAssets({ source, destination: retainedAssets });
}
await copyFile(
  path.join(root, "deploy/serve-client.mjs"),
  path.join(release, "serve-client.mjs"),
);
const plistDir = path.join(homedir(), "Library/LaunchAgents");
await mkdir(plistDir, { recursive: true });
const plist = path.join(plistDir, label + ".plist"),
  escape = (s) =>
    s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const xml = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Label</key><string>${label}</string><key>ProgramArguments</key><array><string>${escape(runtime)}</string><string>${escape(path.join(release, "serve-client.mjs"))}</string></array><key>WorkingDirectory</key><string>${escape(release)}</string><key>EnvironmentVariables</key><dict><key>CLIENT_DIST_ROOT</key><string>${escape(path.join(release, "dist"))}</string><key>CLIENT_ASSET_ROOT</key><string>${escape(retainedAssets)}</string><key>PORT</key><string>3000</string><key>HOST</key><string>0.0.0.0</string></dict><key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>StandardOutPath</key><string>${escape(path.join(logs, "client.log"))}</string><key>StandardErrorPath</key><string>${escape(path.join(logs, "client-error.log"))}</string></dict></plist>`;
await run("launchctl", ["bootout", domain + "/" + label], true);
const listeners = await run("lsof", ["-tiTCP:3000", "-sTCP:LISTEN"], true);
for (const id of listeners.split(/\s+/).filter(Boolean)) {
  const command = await run("ps", ["-p", id, "-o", "command="]),
    cwd = await run("lsof", ["-a", "-p", id, "-d", "cwd", "-Fn"], true);
  if (!command.includes(root) && !cwd.includes("n" + root.replace(/\/$/, "")))
    throw Error(
      `Port 3000 belongs to an unrelated process (${id}); refusing to stop it.`,
    );
  process.kill(Number(id), "SIGTERM");
}
await writeFile(plist, xml);
await run("launchctl", ["bootstrap", domain, plist]);
let ready = false;
for (let i = 0; i < 40; i++) {
  try {
    const r = await fetch("http://127.0.0.1:3000");
    if (r.ok && (await r.text()).includes("/assets/")) {
      ready = true;
      break;
    }
  } catch {}
  await delay(250);
}
if (!ready) throw Error("LaunchAgent did not become healthy; inspect " + logs);
console.log("Deployed Client v2: http://localhost:3000");
console.log("LaunchAgent:", plist);
console.log("The Paddle scanner uses WASM; WebGPU is not required.");
