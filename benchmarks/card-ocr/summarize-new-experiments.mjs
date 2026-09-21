import fs from "node:fs";
import { buildIndex, matchDetections, bounds } from "./photo-match.js";
import { evaluatePhoto } from "./evaluate-photo.js";
const read = (f) => JSON.parse(fs.readFileSync(new URL(f, import.meta.url))),
  index = buildIndex(read("res/card-names.json")),
  truth = read("photo-ground-truth.json");
const summary = [];
for (const id of ["parseq-v1", "parseq-ar-v2"]) {
  const r = read("photo-results/" + id + ".json"),
    m = evaluatePhoto(matchDetections(r.outputs, index), truth);
  summary.push({
    id,
    milliseconds: r.totalMs,
    exportMaxError: r.exportMaxError,
    regions: r.outputs.length,
    correctNames: m.uniqueCorrect,
    falsePositives: m.falsePositives.map((c) => c.name),
    scope: "60 cached automatically selected crops",
  });
}
const context = read("photo-results/card-context-v1.json");
summary.push({
  id: "card-context-v1",
  milliseconds: context.totalMs,
  regions: context.outputs.length,
  result: "Unreliable transcriptions; not used for acceptance",
});
const refs = read("photo-results/references-v1.json"),
  accepted = refs.outputs
    .filter(
      (r) =>
        r.candidates[0]?.score >= 0.85 &&
        r.candidates[0].score - (r.candidates[1]?.score || 0) >= 0.15,
    )
    .map((r) => ({
      name: r.candidates[0].name,
      status: "accepted",
      box: bounds(r.poly),
    })),
  m = evaluatePhoto(accepted, truth);
summary.push({
  id: "references-v1",
  milliseconds: refs.totalMs,
  referenceCount: refs.referenceCount,
  correctNames: m.uniqueCorrect,
  falsePositives: m.falsePositives.map((c) => c.name),
  scope: "60 cached automatically selected crops",
});
fs.writeFileSync(
  new URL("photo-results/new-experiment-summary.json", import.meta.url),
  JSON.stringify(summary, null, 2),
);
console.log(JSON.stringify(summary, null, 2));
