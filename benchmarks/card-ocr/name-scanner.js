import { scanPhoto } from "./photo-scan.js";
import { scanEdges } from "./edge-scan.js";
import { buildIndex, matchDetections } from "./photo-match.js";

/** Browser-only OCR. `names` is the full catalog, never an expected deck list. */
export async function scanCardNames({
  url,
  names,
  isCancelled = () => false,
  onProgress = () => {},
}) {
  const started = performance.now(),
    index = buildIndex(names),
    outputs = [],
    passes = [];
  const configurations = [
    {
      label: "Find small titles",
      run: scanPhoto,
      options: { tileSize: 960, overlap: 200, detThresh: 0.1, boxThresh: 0.3 },
    },
    {
      label: "Second text detector",
      run: scanPhoto,
      options: { tileSize: 1400, overlap: 300, detector: "PP-OCRv6_small_det" },
    },
    {
      label: "Straighten title strips",
      run: scanEdges,
      options: { engine: "direct" },
    },
  ];
  for (let p = 0; p < configurations.length; p++) {
    if (isCancelled()) break;
    const { label, run, options } = configurations[p];
    onProgress({
      phase: label,
      ratio: p / configurations.length,
      candidates: matchDetections(outputs, index),
    });
    const result = await run(
      Object.assign({ url }, options, {
        isCancelled,
        onProgress: (event) =>
          onProgress({
            phase: label,
            ratio: (p + event.completed / event.total) / configurations.length,
            completed: event.completed,
            total: event.total,
          }),
      }),
    );
    passes.push(result);
    for (const output of result.outputs) outputs.push(output);
    onProgress({
      phase: label,
      ratio: (p + 1) / configurations.length,
      candidates: matchDetections(outputs, index),
    });
  }
  const candidates = matchDetections(outputs, index);
  return {
    names: Array.from(
      new Set(
        candidates.filter((c) => c.status === "accepted").map((c) => c.name),
      ),
    ).sort(),
    candidates,
    passes,
    totalMs: performance.now() - started,
    cancelled: isCancelled(),
  };
}
window.scanCardNames = scanCardNames;
