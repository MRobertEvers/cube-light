import * as ort from "onnxruntime-web";
import { getCV } from "./edge-titles.js";
ort.env.wasm.numThreads = 1;
window.scanPARSeq = async ({ limit = 0, ar = false, pad = 0 } = {}) => {
  const dir = ar ? "parseq-ar" : "parseq";
  const start = performance.now(),
    session = await ort.InferenceSession.create(`/models/${dir}/model.onnx`, {
      executionProviders: ["wasm"],
    }),
    config = await (await fetch(`/models/${dir}/config.json`)).json(),
    chars = config.characters;
  const testInput = new ort.Tensor(
      "float32",
      new Float32Array(
        await (await fetch(`/models/${dir}/check-input.bin`)).arrayBuffer(),
      ),
      [1, 3, 32, 128],
    ),
    testOutput = await session.run({ image: testInput }),
    expected = await (await fetch(`/models/${dir}/check-logits.json`)).json();
  let exportMaxError = 0;
  for (let i = 0; i < expected.length; i++)
    exportMaxError = Math.max(
      exportMaxError,
      Math.abs(expected[i] - testOutput.logits.data[i]),
    );
  testInput.dispose();
  testOutput.logits.dispose();
  console.log("PARSeq export error", exportMaxError);
  if (exportMaxError > 0.01) throw Error("Export mismatch");
  const names = (await (await fetch("/res/card-names.json")).json())
    .filter((n) => !n.startsWith("A-"))
    .map((name) => ({
      name,
      ids: [...name.replace(/\s/g, "")].map((c) => chars.indexOf(c)),
    }))
    .filter((n) => n.ids.length <= 25 && n.ids.every((i) => i > 0));
  const image = await createImageBitmap(
      await (await fetch("/res/IMG_8535.jpeg")).blob(),
    ),
    { cv } = await getCV(),
    full = document.createElement("canvas");
  full.width = image.width;
  full.height = image.height;
  full.getContext("2d").drawImage(image, 0, 0);
  const src = cv.imread(full),
    proposals = (
      await (
        await fetch("/photo-results/glm-constrained-preserve-crops-v4.json")
      ).json()
    ).outputs,
    outputs = [],
    loadMs = performance.now() - start;
  try {
    for (const r of limit ? proposals.slice(0, limit) : proposals) {
      const from = cv.matFromArray(4, 1, cv.CV_32FC2, r.poly.flat()),
        to = cv.matFromArray(4, 1, cv.CV_32FC2, [
          pad,
          pad,
          128 - pad,
          pad,
          128 - pad,
          32 - pad,
          pad,
          32 - pad,
        ]),
        M = cv.getPerspectiveTransform(from, to),
        out = new cv.Mat();
      cv.warpPerspective(
        src,
        out,
        M,
        new cv.Size(128, 32),
        cv.INTER_CUBIC,
        cv.BORDER_REPLICATE,
      );
      const c = document.createElement("canvas");
      cv.imshow(c, out);
      const rgba = c.getContext("2d").getImageData(0, 0, 128, 32).data,
        input = new Float32Array(3 * 128 * 32);
      for (let i = 0; i < 128 * 32; i++)
        for (let k = 0; k < 3; k++)
          input[k * 128 * 32 + i] = rgba[i * 4 + k] / 127.5 - 1;
      const tensor = new ort.Tensor("float32", input, [1, 3, 32, 128]),
        result = await session.run({ image: tensor }),
        logits = result.logits,
        classes = logits.dims[2],
        logp = [];
      let text = "",
        sum = 0,
        count = 0,
        ended = false;
      for (let t = 0; t < logits.dims[1]; t++) {
        const row = Array.from(
            logits.data.slice(t * classes, (t + 1) * classes),
          ),
          max = Math.max(...row),
          lse = max + Math.log(row.reduce((s, v) => s + Math.exp(v - max), 0)),
          lp = row.map((v) => v - lse);
        logp.push(lp);
        const best = row.indexOf(max);
        if (!ended) {
          sum += lp[best];
          count++;
          if (best === 0) ended = true;
          else text += chars[best];
        }
      }
      const lexical = names
        .map((n) => {
          let logProbability = logp[n.ids.length][0];
          for (let i = 0; i < n.ids.length; i++)
            logProbability += logp[i][n.ids[i]];
          return {
            name: n.name,
            logProbability,
            support: Math.exp(logProbability / (n.ids.length + 1)),
          };
        })
        .sort((a, b) => b.logProbability - a.logProbability)
        .slice(0, 5);
      outputs.push({
        poly: r.poly,
        lexical,
        items: [{ text, score: Math.exp(sum / count), poly: r.poly }],
      });
      console.log(
        "PARSeq",
        outputs.length,
        text,
        JSON.stringify(lexical.slice(0, 2)),
      );
      for (const m of [from, to, M, out]) m.delete();
      tensor.dispose();
      logits.dispose();
    }
    return {
      engine: ar ? "parseq-ar-refine1" : "parseq-nar-refine2",
      pad,
      totalMs: performance.now() - start,
      loadMs,
      exportMaxError,
      usesCachedProposals: true,
      outputs,
    };
  } finally {
    src.delete();
    image.close();
    await session.release();
  }
};
