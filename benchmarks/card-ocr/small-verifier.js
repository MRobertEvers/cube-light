import { getCV } from "./edge-titles.js";
import { createRecognizer } from "./direct-recognizer.js";
import { bounds, sameLine } from "./photo-match.js";
window.compareSmallVerifiers = async () => {
  const image = await createImageBitmap(
      await (await fetch("/res/IMG_8535.jpeg")).blob(),
    ),
    full = document.createElement("canvas");
  full.width = image.width;
  full.height = image.height;
  full.getContext("2d").drawImage(image, 0, 0);
  const { cv } = await getCV(),
    src = cv.imread(full),
    prior = await (
      await fetch("/photo-results/clientv2-production.json")
    ).json(),
    rough = prior.passes.find((p) => p.engine === "font-proposals").outputs,
    glm = prior.passes.find((p) => p.engine === "glm-finite-catalog").outputs,
    regions = [];
  for (const row of glm) {
    let found = rough.find(
      (r) => JSON.stringify(r.poly) === JSON.stringify(row.poly),
    );
    if (!found)
      found = rough
        .filter((r) => sameLine(bounds(r.poly), bounds(row.poly)))
        .sort((a, b) => b.candidates[0].score - a.candidates[0].score)[0];
    if (found) regions.push({ poly: row.poly, candidates: found.candidates });
  }
  const runs = [];
  try {
    for (const model of ["small", "medium", "server"]) {
      const started = performance.now(),
        reader = await createRecognizer(model, 1, false, 0, true),
        loadMs = performance.now() - started,
        outputs = [];
      try {
        for (const row of regions) {
          const w = Math.max(
              32,
              Math.round(
                Math.hypot(
                  row.poly[1][0] - row.poly[0][0],
                  row.poly[1][1] - row.poly[0][1],
                ) * 3,
              ),
            ),
            h = Math.max(
              24,
              Math.round(
                Math.hypot(
                  row.poly[3][0] - row.poly[0][0],
                  row.poly[3][1] - row.poly[0][1],
                ) * 3,
              ),
            ),
            p = 8,
            from = cv.matFromArray(4, 1, cv.CV_32FC2, row.poly.flat()),
            to = cv.matFromArray(4, 1, cv.CV_32FC2, [
              p,
              p,
              w + p,
              p,
              w + p,
              h + p,
              p,
              h + p,
            ]),
            M = cv.getPerspectiveTransform(from, to),
            out = new cv.Mat();
          cv.warpPerspective(
            src,
            out,
            M,
            new cv.Size(w + 2 * p, h + 2 * p),
            cv.INTER_CUBIC,
            cv.BORDER_REPLICATE,
          );
          const canvas = document.createElement("canvas");
          cv.imshow(canvas, out);
          const prediction = await reader.recognize(
              canvas,
              row.candidates.slice(0, 8).map((c) => c.name),
            ),
            ranked = prediction.lexical || [],
            searchGap =
              ranked.length > 1
                ? ranked[0].meanLogProbability - ranked[1].meanLogProbability
                : 0;
          outputs.push({
            poly: row.poly,
            text: prediction.text,
            result: { ranked, searchGap },
          });
          console.log(
            "Small verifier",
            model,
            outputs.length,
            prediction.text,
            ranked[0]?.name,
            searchGap,
          );
          for (const m of [from, to, M, out]) m.delete();
        }
        runs.push({
          model,
          totalMs: performance.now() - started,
          loadMs,
          outputs,
        });
      } finally {
        reader.dispose();
      }
    }
    return {
      scope:
        "Verifier-only comparison on the same 18 automatically generated GLM crop geometries; cached proposals, no expected names",
      runs,
    };
  } finally {
    image.close();
    src.delete();
  }
};
