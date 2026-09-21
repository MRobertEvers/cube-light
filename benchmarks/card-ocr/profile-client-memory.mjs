import { chromium } from "playwright";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { evaluatePhoto } from "./evaluate-photo.js";
const exec = promisify(execFile),
  origin = process.env.PROFILE_ORIGIN || "http://127.0.0.1:3000",
  runs = Number(process.env.PROFILE_RUNS || 2);
const assets = new URL("../../projects/clientv2/dist/assets/", import.meta.url),
  entry = (await readdir(assets)).find((f) =>
    /^experimental-scanner-.*\.js$/.test(f),
  );
const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  }),
  browserCDP = await browser.newBrowserCDPSession(),
  page = await browser.newPage(),
  cdp = await page.context().newCDPSession(page);
let phase = "page-load",
  run = 0,
  stopped = false;
const began = Date.now(),
  rss = [],
  heap = [],
  phases = [],
  processTypes = new Map(),
  errors = [],
  forbidden = [],
  network = [];
let rootPid;
const info = await browserCDP.send("SystemInfo.getProcessInfo");
for (const p of info.processInfo) processTypes.set(p.id, p.type);
rootPid = info.processInfo.find((p) => p.type === "browser").id;
const sourceCommit = (await exec("git", ["rev-parse", "HEAD"])).stdout.trim();
const environment = {
  headless: true,
  bundle: entry,
  browser: browser.version(),
  platform: process.platform,
  arch: process.arch,
  cpu: (await exec("sysctl", ["-n", "machdep.cpu.brand_string"])).stdout.trim(),
  ramBytes: Number((await exec("sysctl", ["-n", "hw.memsize"])).stdout),
  swapBefore: (await exec("sysctl", ["vm.swapusage"])).stdout.trim(),
  origin,
};
async function sampleRSS() {
  const { stdout } = await exec("ps", ["-axo", "pid=,ppid=,rss=,%cpu="]);
  const rows = stdout
      .trim()
      .split("\n")
      .map((l) => l.trim().split(/\s+/).map(Number)),
    ids = new Set([rootPid]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [pid, ppid] of rows)
      if (ids.has(ppid) && !ids.has(pid)) {
        ids.add(pid);
        changed = true;
      }
  }
  const processes = rows
    .filter((r) => ids.has(r[0]))
    .map(([pid, ppid, kib, cpu]) => ({
      pid,
      ppid,
      rssBytes: kib * 1024,
      cpuPercent: cpu,
      type: processTypes.get(pid) || "child",
    }));
  rss.push({
    ms: Date.now() - began,
    run,
    phase,
    totalBytes: processes.reduce((s, p) => s + p.rssBytes, 0),
    processes,
  });
}
async function sampleHeap() {
  const r = await cdp.send("Performance.getMetrics"),
    m = Object.fromEntries(r.metrics.map((m) => [m.name, m.value]));
  heap.push({
    ms: Date.now() - began,
    run,
    phase,
    usedBytes: m.JSHeapUsedSize,
    totalBytes: m.JSHeapTotalSize,
    taskDurationSeconds: m.TaskDuration,
    scriptDurationSeconds: m.ScriptDuration,
  });
}
await cdp.send("Performance.enable");
await cdp.send("Network.enable");
const urls = new Map();
cdp.on("Network.requestWillBeSent", (e) =>
  urls.set(e.requestId, new URL(e.request.url).pathname),
);
cdp.on("Network.loadingFinished", (e) =>
  network.push({
    run,
    phase,
    path: urls.get(e.requestId),
    bytes: e.encodedDataLength,
  }),
);
await page.exposeFunction("profilePhase", (event) => {
  if (event.phase !== phase) {
    phase = event.phase;
    phases.push({ ms: Date.now() - began, run, phase });
    console.log("PHASE", run, phase);
  }
});
await page.addInitScript(() => {
  globalThis.__profileTasks = [];
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries())
        globalThis.__profileTasks.push({
          start: e.startTime,
          duration: e.duration,
        });
    }).observe({ type: "longtask", buffered: true });
  } catch {}
});
await cdp.send("Network.setBlockedURLs", {
  urls: ["*/photo-results/*", "*/photo-ground-truth.json"],
});
cdp.on("Network.requestWillBeSent", (e) => {
  if (
    e.request.url.includes("/photo-results/") ||
    e.request.url.includes("/photo-ground-truth.json")
  )
    forbidden.push(e.request.url);
});
page.on("pageerror", (e) => errors.push(String(e)));
const rssLoop = (async () => {
  while (!stopped) {
    try {
      await sampleRSS();
    } catch (e) {
      errors.push("RSS " + String(e));
    }
    await delay(1000);
  }
})();
const heapLoop = (async () => {
  while (!stopped) {
    try {
      await sampleHeap();
    } catch (e) {
      errors.push("Heap " + String(e));
    }
    await delay(2000);
  }
})();
const results = [];
try {
  await page.goto(origin);
  const photoBase64 = (
    await readFile(new URL("./res/IMG_8535.jpeg", import.meta.url))
  ).toString("base64");
  await page.evaluate((data) => {
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    globalThis.__profilePhotoUrl = URL.createObjectURL(
      new Blob([bytes], { type: "image/jpeg" }),
    );
  }, photoBase64);
  phase = "idle-before-import";
  await delay(3000);
  await sampleRSS();
  for (run = 1; run <= runs; run++) {
    phase = "module-loading";
    console.log("RUN", run);
    const result = await page.evaluate(async (entry) => {
      globalThis.__profileTasks = [];
      const { scanExperimental } = await import("/assets/" + entry),
        names = await (await fetch("/ocr/card-names.json")).json(),
        start = performance.now();
      const result = await scanExperimental({
        url: globalThis.__profilePhotoUrl,
        names,
        onProgress: (event) => {
          void window.profilePhase({ phase: event.phase });
        },
      });
      const tasks = globalThis.__profileTasks.filter((t) => t.start >= start),
        longTasks = {
          count: tasks.length,
          totalMs: tasks.reduce((s, t) => s + t.duration, 0),
          blockingMs: tasks.reduce(
            (s, t) => s + Math.max(0, t.duration - 50),
            0,
          ),
          maxMs: Math.max(0, ...tasks.map((t) => t.duration)),
        };
      return {
        names: result.names,
        candidates: result.candidates,
        totalMs: result.totalMs,
        timings: result.passes.map((p) => ({
          engine: p.engine,
          totalMs: p.totalMs,
        })),
        longTasks,
      };
    }, entry);
    const truth = JSON.parse(
      await readFile(
        new URL("./photo-ground-truth.json", import.meta.url),
        "utf8",
      ),
    );
    result.metrics = evaluatePhoto(result.candidates, truth);
    results.push(result);
    console.log(
      "SCAN",
      run,
      JSON.stringify({
        ms: result.totalMs,
        names: result.metrics.uniqueCorrect,
        false: result.metrics.falsePositives.length,
        longTasks: result.longTasks,
      }),
    );
    phase = "idle-after-scan";
    await sampleRSS();
    await sampleHeap();
    await delay(10000);
    await sampleRSS();
    await sampleHeap();
    const latest = await browserCDP.send("SystemInfo.getProcessInfo");
    for (const p of latest.processInfo) processTypes.set(p.id, p.type);
    await writeFile(
      new URL("./photo-results/client-memory-progress.json", import.meta.url),
      JSON.stringify({
        environment,
        results,
        rss,
        heap,
        phases,
        network,
        errors,
        forbidden,
      }),
    );
  }
  // Diagnostic only, after both natural runs and their post-scan idle samples.
  run = runs;
  phase = "forced-gc-diagnostic";
  await cdp.send("HeapProfiler.collectGarbage");
  await delay(3000);
  await sampleRSS();
  await sampleHeap();
  environment.swapAfter = (
    await exec("sysctl", ["vm.swapusage"])
  ).stdout.trim();
  const report = {
    date: new Date().toISOString(),
    sourceCommit,
    environment,
    sampling: {
      rssIntervalMs: 1000,
      heapIntervalMs: 2000,
      forcedGC: "Only after both measured runs; no forced GC between scans",
      httpCache:
        "Normal browser HTTP cache; fixture passed as a Blob URL, no Playwright request routing",
    },
    results,
    rss,
    heap,
    phases,
    network,
    errors,
    forbidden,
  };
  await writeFile(
    new URL("./photo-results/client-memory-profile.json", import.meta.url),
    JSON.stringify(report, null, 2),
  );
  console.log(
    "PROFILE COMPLETE",
    rss.length,
    "samples",
    "peak RSS MiB",
    Math.max(...rss.map((r) => r.totalBytes)) / 1024 ** 2,
  );
} finally {
  stopped = true;
  await Promise.allSettled([rssLoop, heapLoop]);
  await browser.close();
}
