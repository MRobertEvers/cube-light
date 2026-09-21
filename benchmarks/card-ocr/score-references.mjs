import fs from "node:fs";
import { bounds, sameLine } from "./photo-match.js";
import { evaluatePhoto } from "./evaluate-photo.js";
const read = (f) => JSON.parse(fs.readFileSync(new URL(f, import.meta.url))),
  truth = read("photo-ground-truth.json"),
  base = read("photo-results/consensus-v14.json"),
  references = read("photo-results/references-v1.json");
for (const threshold of [0.75, 0.8, 0.85])
  for (const gap of [0.08, 0.12, 0.15]) {
    const candidates = [...base.candidates];
    for (const row of references.outputs) {
      const [a, b] = row.candidates;
      if (!a || a.score < threshold || a.score - (b?.score || 0) < gap)
        continue;
      const c = {
        name: a.name,
        text: "Printed reference title",
        status: "accepted",
        poly: row.poly,
        box: bounds(row.poly),
        score: a.score,
        margin: a.score - (b?.score || 0),
      };
      if (!candidates.some((p) => sameLine(p.box, c.box))) candidates.push(c);
    }
    const metrics = evaluatePhoto(candidates, truth);
    console.log(
      threshold,
      gap,
      JSON.stringify({
        names: metrics.uniqueCorrect,
        correct: metrics.correct,
        false: metrics.falsePositives.map((c) => c.name),
      }),
    );
    if (threshold === 0.8 && gap === 0.12)
      fs.writeFileSync(
        new URL("photo-results/reference-composite-v15.json", import.meta.url),
        JSON.stringify(
          {
            scope: "Cached composite, not a fresh end-to-end run",
            names: [...new Set(candidates.map((c) => c.name))].sort(),
            candidates,
            metrics,
            totalMs: null,
          },
          null,
          2,
        ),
      );
  }
