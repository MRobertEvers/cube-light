import { readFile, writeFile } from "node:fs/promises";
import { addTextConsensus } from "./consensus.js";
import { evaluatePhoto } from "./evaluate-photo.js";
const read = async (f) =>
    JSON.parse(await readFile(new URL("./" + f, import.meta.url), "utf8")),
  prior = await read("photo-results/clientv2-production.json"),
  base = (await read("photo-results/ablation-no-glm-profile.json")).results[0]
    .candidates,
  rough = prior.passes.find((p) => p.engine === "font-proposals").outputs,
  truth = await read("photo-ground-truth.json"),
  test = await read("photo-results/small-verifiers-v1.json");
const results = [];
for (const run of test.runs) {
  const accepted = addTextConsensus(base, run.outputs, rough),
    m = evaluatePhoto(accepted, truth);
  results.push({
    model: run.model,
    milliseconds: run.totalMs,
    correctNames: m.uniqueCorrect,
    correctTitles: m.correct,
    falsePositives: m.falsePositives.map((c) => c.name),
    addedNames: [...new Set(accepted.map((c) => c.name))].filter(
      (n) => !base.some((c) => c.name === n),
    ),
  });
  const targets = run.outputs.filter((r) =>
    r.result.ranked.some((c) => c.name === "Inventor's Goggles"),
  );
  console.log(run.model, JSON.stringify(results.at(-1)));
  for (const t of targets)
    console.log(
      "Goggles candidates",
      JSON.stringify(t.result.ranked.slice(0, 3)),
    );
}
await writeFile(
  new URL("./photo-results/small-verifier-summary.json", import.meta.url),
  JSON.stringify(results, null, 2),
);
