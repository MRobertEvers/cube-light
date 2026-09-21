import { rectifyPlane } from "./rectify-plane.js";
import { findTitleStrips, stripCanvas } from "./edge-titles.js";
import {
  GlmOcrForConditionalGeneration,
  AutoProcessor,
  RawImage,
  env,
} from "transformers-v4";
env.allowLocalModels = true;
env.allowRemoteModels = false;
env.localModelPath = "/models/";
env.useBrowserCache = false;
env.backends.onnx.wasm.numThreads = 1;
export async function contextCrops(image) {
  const plane = await rectifyPlane(image),
    lines = await findTitleStrips(plane.canvas);
  const selected = lines
    .filter(
      (l) =>
        l.length > plane.cardWidth * 0.65 && l.length < plane.cardWidth * 1.15,
    )
    .sort((a, b) => a.y1 - b.y1 || a.x1 - b.x1);
  return selected.map((line) => {
    const crop = stripCanvas(plane.canvas, line, {
      offset: 0,
      height: 1.42,
      padding: 0,
      right: 0,
    });
    return {
      canvas: crop.canvas,
      poly: crop.poly.map((p) => plane.toOriginal(...p)),
      titlePoly: stripCanvas(plane.canvas, line, {
        offset: 0.02,
        height: 0.1,
        padding: 0.02,
        right: 0.05,
      }).poly.map((p) => plane.toOriginal(...p)),
      line,
    };
  });
}
window.scanContext = async ({ limit = 0 } = {}) => {
  const start = performance.now(),
    image = await createImageBitmap(
      await (await fetch("/res/IMG_8535.jpeg")).blob(),
    ),
    crops = await contextCrops(image);
  console.log("Context proposals", crops.length);
  const selectionMs = performance.now() - start,
    model = await GlmOcrForConditionalGeneration.from_pretrained("glm", {
      device: "webgpu",
      dtype: "fp16",
    }),
    processor = await AutoProcessor.from_pretrained("glm"),
    loadMs = performance.now() - start - selectionMs,
    outputs = [];
  const prompt = processor.apply_chat_template(
    [
      {
        role: "user",
        content: [
          { type: "image" },
          { type: "text", text: "Text Recognition:" },
        ],
      },
    ],
    { add_generation_prompt: true },
  );
  try {
    for (const crop of limit ? crops.slice(0, limit) : crops) {
      const began = performance.now(),
        inputs = await processor(prompt, RawImage.fromCanvas(crop.canvas)),
        ids = await model.generate({
          ...inputs,
          max_new_tokens: 220,
          do_sample: false,
        }),
        text = processor.tokenizer
          .decode(ids.tolist()[0].slice(inputs.input_ids.dims[1]), {
            skip_special_tokens: true,
          })
          .trim();
      outputs.push({
        text,
        poly: crop.poly,
        titlePoly: crop.titlePoly,
        line: crop.line,
        ms: performance.now() - began,
      });
      console.log("Context", outputs.length, JSON.stringify(text));
    }
    return {
      engine: "glm-card-context",
      totalMs: performance.now() - start,
      selectionMs,
      loadMs,
      outputs,
    };
  } finally {
    await model.dispose();
    image.close();
  }
};
