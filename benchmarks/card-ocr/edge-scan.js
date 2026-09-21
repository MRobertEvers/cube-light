import { createRecognizer } from "./direct-recognizer.js";
import { PaddleOCR } from "@paddleocr/paddleocr-js";
import { createWorker } from "tesseract.js";
import { findTitleStrips, stripCanvas, trimTitleBand } from "./edge-titles.js";
export const scanEdges = (window.scanEdges = async ({
  url = "/res/IMG_8535.jpeg",
  engine = "paddle",
  recModel = "small",
  stretch = 1,
  enhance = false,
  deblur = 0,
  trim = false,
  onProgress,
  isCancelled = () => false,
} = {}) => {
  const image = await createImageBitmap(await (await fetch(url)).blob()),
    start = performance.now();
  let worker;
  try {
    const lines = await findTitleStrips(image);
    console.log(`Found ${lines.length} edges`);
    worker =
      engine === "direct"
        ? await createRecognizer(recModel, stretch, enhance, deblur)
        : engine === "tesseract"
          ? await createWorker("eng")
          : await PaddleOCR.create({
              worker: true,
              textDetectionModelName: "PP-OCRv5_mobile_det",
              textRecognitionModelName: "PP-OCRv6_small_rec",
              ortOptions: { backend: "wasm", numThreads: 1, simd: true },
            });
    if (engine === "tesseract")
      await worker.setParameters({ tessedit_pageseg_mode: "7" });
    const outputs = [];
    outer: for (const line of lines) {
      if (isCancelled()) break;
      for (const offset of trim ? [0.015] : [0.02, 0.05, 0.08, 0.11]) {
        if (isCancelled()) break outer;
        const strip = stripCanvas(image, line, {
          offset,
          height: trim ? 0.18 : 0.075,
          padding: 0.015,
          right: 0.015,
        });
        const band = trim
          ? trimTitleBand(strip.canvas)
          : { canvas: strip.canvas, left: 0, top: 0, pad: 0 };
        const { canvas } = band;
        const toImage = (x, y) =>
          strip.toImage(x + band.left - band.pad, y + band.top - band.pad);
        const poly = trim
          ? [
              [band.pad, band.pad],
              [canvas.width - band.pad, band.pad],
              [canvas.width - band.pad, canvas.height - band.pad],
              [band.pad, canvas.height - band.pad],
            ].map((p) => toImage(...p))
          : strip.poly;
        let items;
        if (engine === "direct") {
          const result = await worker.recognize(canvas);
          items = [{ text: result.text, score: result.score, poly }];
        } else if (engine === "tesseract") {
          const { data } = await worker.recognize(canvas);
          items = [
            { text: data.text.trim(), score: data.confidence / 100, poly },
          ];
        } else
          items = (
            await worker.predict(canvas, {
              textDetThresh: 0.15,
              textDetBoxThresh: 0.3,
              textRecScoreThresh: 0.3,
            })
          )[0].items.map((i) => ({
            ...i,
            poly: i.poly.map((p) => toImage(...p)),
          }));
        outputs.push({ line, offset, items });
        console.log(
          `${engine} edge ${outputs.length}/${lines.length * (trim ? 1 : 4)}`,
        );
        onProgress?.({
          completed: outputs.length,
          total: lines.length * (trim ? 1 : 4),
          items,
        });
      }
    }
    return {
      engine,
      recModel,
      stretch,
      enhance,
      trim,
      mode: "edges",
      width: image.width,
      height: image.height,
      totalMs: performance.now() - start,
      lines,
      outputs,
    };
  } finally {
    image.close();
    await worker?.dispose?.();
    await worker?.terminate?.();
  }
});
