import { readFile, writeFile } from "node:fs/promises";
const data = JSON.parse(
  await readFile(
    new URL("./photo-results/client-memory-profile.json", import.meta.url),
    "utf8",
  ),
);
const peak = (rows, key) =>
  rows.length ? Math.max.apply(null, rows.map((r) => r[key] || 0)) : null;
const types = new Map();
for (const sample of data.rss)
  for (const p of sample.processes)
    if (p.type !== "child") types.set(p.pid, p.type);
const rssValue = (sample) => ({
  ms: sample.ms,
  bytes: sample.totalBytes,
  gpuProcessRssBytes: sample.processes
    .filter((p) => (types.get(p.pid) || p.type).toLowerCase().includes("gpu"))
    .reduce((s, p) => s + p.rssBytes, 0),
});
const runs = data.results.map((result, i) => {
  const number = i + 1,
    rows = data.rss.filter(
      (r) => r.run === number && r.phase !== "forced-gc-diagnostic",
    ),
    heaps = data.heap.filter(
      (r) => r.run === number && r.phase !== "forced-gc-diagnostic",
    );
  const idle = rows.filter((r) => r.phase === "idle-after-scan"),
    idleHeap = heaps.filter((r) => r.phase === "idle-after-scan");
  const phases = Array.from(new Set(rows.map((r) => r.phase))).map((phase) => {
    const selected = rows.filter((r) => r.phase === phase),
      h = heaps.filter((r) => r.phase === phase);
    return {
      phase,
      samples: selected.length,
      peakRssBytes: peak(selected, "totalBytes"),
      peakJSHeapBytes: peak(h, "usedBytes"),
    };
  });
  const net = data.network.filter((r) => r.run === number);
  return {
    number,
    milliseconds: result.totalMs,
    names: result.metrics.uniqueCorrect,
    falsePositives: result.metrics.falsePositives.length,
    peakProcessRssBytes: peak(rows, "totalBytes"),
    peakJSHeapUsedBytes: peak(heaps, "usedBytes"),
    peakGPUProcessRssBytes: Math.max.apply(
      null,
      rows.map((r) => rssValue(r).gpuProcessRssBytes),
    ),
    idleImmediate: idle.length ? rssValue(idle[0]) : null,
    idleAfter10Seconds: idle.length ? rssValue(idle.at(-1)) : null,
    idleHeapAfter10Seconds: idleHeap.at(-1)?.usedBytes,
    longTasks: result.longTasks,
    observedTransferBytes: net.reduce((s, r) => s + r.bytes, 0),
    phases,
    timings: result.timings,
  };
});
const baseline = data.rss.filter((r) => r.phase === "idle-before-import"),
  gc = data.rss.filter((r) => r.phase === "forced-gc-diagnostic"),
  gcHeap = data.heap.filter((r) => r.phase === "forced-gc-diagnostic");
const summary = {
  date: data.date,
  sourceCommit: data.sourceCommit ?? null,
  environment: data.environment,
  methodology: {
    rssIntervalMs: data.sampling.rssIntervalMs,
    heapIntervalMs: data.sampling.heapIntervalMs,
    forcedGC: data.sampling.forcedGC,
    httpCache: data.sampling.httpCache,
    scope:
      "Isolated Chrome process tree only; excludes Node profiler and frontend/API servers",
    rss: "Sum of ps RSS; shared pages can be counted multiple times; not unique physical memory or complete GPU allocation accounting",
    heap: "CDP main-page JS heap only; does not comprehensively include workers, ArrayBuffers, WASM or WebGPU allocations",
    network:
      "CDP page-observed encodedDataLength; not a complete worker/OS/TLS traffic accounting",
    peaks: "Sampled maxima, not guaranteed instantaneous peaks",
    phaseLabels:
      "Last reported progress phase; following-stage setup can occur before the next progress event",
    fixture:
      "Original JPEG materialized as a Blob URL from automation-supplied bytes before timed scans; baseline includes fixture setup",
  },
  baseline: baseline.length ? rssValue(baseline.at(-1)) : null,
  runs,
  afterForcedGC: gc.length
    ? {
        ms: rssValue(gc.at(-1)).ms,
        bytes: rssValue(gc.at(-1)).bytes,
        gpuProcessRssBytes: rssValue(gc.at(-1)).gpuProcessRssBytes,
        jsHeapUsedBytes: gcHeap.at(-1)?.usedBytes,
      }
    : null,
  errors: data.errors,
  forbiddenFixtureRequests: data.forbidden,
};
await writeFile(
  new URL("./memory-benchmark-summary.json", import.meta.url),
  JSON.stringify(summary, null, 2) + "\n",
);
console.log(JSON.stringify(summary, null, 2));
