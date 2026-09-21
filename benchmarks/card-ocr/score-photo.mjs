import { readFile, writeFile, readdir } from "node:fs/promises";
import { evaluatePhoto as score } from "./evaluate-photo.js";
import { buildIndex, matchDetections, bounds } from "./photo-match.js";
const read = async (p) =>
  JSON.parse(await readFile(new URL(p, import.meta.url), "utf8"));
const truth = await read("./photo-ground-truth.json"),
  index = buildIndex(await read("./res/card-names.json"));
const summary = [];
for (const file of (
  await readdir(new URL("./photo-results/", import.meta.url))
).filter((f) => f.endsWith(".json") && !f.endsWith(".scored.json"))) {
  const run = await read("./photo-results/" + file);
  if (!run.outputs || run.engine === "collectorvision") continue;
  const candidates = matchDetections(run.outputs, index),
    metrics = score(candidates, truth);
  const result = { file, ms: run.totalMs, ...metrics, candidates };
  await writeFile(
    new URL(
      "./photo-results/" + file.replace(".json", ".scored.json"),
      import.meta.url,
    ),
    JSON.stringify(result, null, 2),
  );
  console.log(
    file,
    `${metrics.correct}/${truth.cards.length}; full ${metrics.fullCorrect}/${metrics.fullTotal}; unique ${metrics.uniqueCorrect}/${metrics.uniqueTotal}; false ${metrics.falsePositives.length}; ${(run.totalMs / 1000).toFixed(1)}s`,
  );
  console.log(
    "missed full:",
    metrics.missing
      .filter((c) => c.visibility === "full")
      .map((c) => `${c.id} ${c.name}`)
      .join(", "),
  );
  console.log(
    "false:",
    metrics.falsePositives.map((c) => `${c.text} → ${c.name}`).join(", "),
  );
  summary.push(result);
}
await writeFile(
  new URL("./photo-results/summary.json", import.meta.url),
  JSON.stringify(summary, null, 2),
);
