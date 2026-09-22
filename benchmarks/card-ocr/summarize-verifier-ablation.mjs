import { readFile, writeFile } from "node:fs/promises";
const read = async (p) =>
    JSON.parse(await readFile(new URL(p, import.meta.url), "utf8")),
  manifest = await read("../../deploy/ocr-assets.json"),
  result = {
    date: new Date().toISOString(),
    scope:
      "Same photo and pre-verification stages; fresh Chrome per run. RSS is the sampled sum of Chrome process RSS, not unique physical memory.",
    runs: [],
  };
for (const [name, id] of [
  ["none", "ablation-no-glm"],
  ["paddle-medium", "ablation-paddle-medium"],
  ["glm", "ablation-glm-control"],
]) {
  let p;
  try {
    p = await read("./photo-results/" + id + "-profile.json");
  } catch {
    continue;
  }
  const r = p.results[0],
    rss = p.rss.filter(
      (x) => x.run === 1 && x.phase !== "forced-gc-diagnostic",
    ),
    idle = rss.filter((x) => x.phase === "idle-after-scan");
  const used = manifest.assets.filter((a) =>
    name === "glm"
      ? !a.path.includes("medium-rec.")
      : !a.path.startsWith("models/glm/") &&
        (name === "paddle-medium" || !a.path.includes("medium-rec.")),
  );
  const stages = (r.stages || []).map((s) => ({
    stage: s.stage,
    names: [...new Set(s.candidates.map((c) => c.name))].sort(),
    titleInstances: s.candidates.length,
  }));
  result.runs.push({
    verifier: name,
    id,
    environment: p.environment,
    totalMs: r.totalMs,
    names: r.names,
    correctNames: r.metrics.uniqueCorrect,
    correctTitles: r.metrics.correct,
    falsePositives: r.metrics.falsePositives.map((c) => c.name),
    peakRssBytes: Math.max(...rss.map((s) => s.totalBytes)),
    idleRssBytes: idle.at(-1)?.totalBytes,
    requiredAssetBytes: used.reduce((n, a) => n + a.bytes, 0),
    largestModelBytes: Math.max(
      ...used.filter((a) => /\.onnx|\.tar$/.test(a.path)).map((a) => a.bytes),
    ),
    timings: r.timings,
    stages,
    errors: p.errors,
    forbiddenRequests: p.forbidden,
    observedTransferBytes: p.network
      .filter((n) => n.run === 1)
      .reduce((n, a) => n + a.bytes, 0),
    glmRequests: p.network.filter((n) => n.path?.includes("/models/glm/"))
      .length,
    longTasks: r.longTasks,
  });
}
await writeFile(
  new URL("./verifier-ablation-summary.json", import.meta.url),
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result, null, 2));
