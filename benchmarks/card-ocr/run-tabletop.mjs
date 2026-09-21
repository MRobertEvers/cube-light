import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { evaluatePhoto } from "./evaluate-photo.js";
const root = fileURLToPath(new URL(".", import.meta.url));
const server = await createServer({
  root,
  configFile: false,
  optimizeDeps: {
    include: [
      "@paddleocr/paddleocr-js",
      "tesseract.js",
      "@techstark/opencv-js",
      "onnxruntime-web",
      "js-yaml",
    ],
  },
  server: {
    host: "127.0.0.1",
    port: 4183,
    strictPort: true,
    watch: { ignored: ["**/photo-results/**", "**/models/**"] },
  },
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
    }),
    requests = [],
    errors = [];
  page.on("request", (request) =>
    requests.push({ method: request.method(), url: request.url() }),
  );
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.route("**/photo-ground-truth.json", (route) => route.abort());
  await page.goto("http://127.0.0.1:4183/harness.html");
  await page.waitForFunction(() => typeof window.scanCardNames === "function");
  const result = await page.evaluate(async () =>
    window.scanCardNames({
      url: "/res/IMG_8535.jpeg",
      names: await (await fetch("/res/card-names.json")).json(),
      onProgress: (e) => {
        if (e.candidates)
          console.log(
            e.phase,
            e.candidates.filter((c) => c.status === "accepted").length,
          );
      },
    }),
  );
  await page.evaluate(
    async (outputs) => {
      await document.getElementById("photo").decode();
      (await import("/harness-ui.js")).render(outputs);
      document.getElementById("status").textContent =
        "Benchmark complete · inspect the OCR evidence";
      document.getElementById("progress").value = 1;
    },
    result.passes.flatMap((pass) => pass.outputs),
  );
  await mkdir(new URL("./photo-results/", import.meta.url), {
    recursive: true,
  });
  await page.screenshot({
    path: fileURLToPath(
      new URL("./photo-results/harness.png", import.meta.url),
    ),
    fullPage: true,
  });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  await (
    await downloadPromise
  ).saveAs(
    fileURLToPath(new URL("./photo-results/export.json", import.meta.url)),
  );
  const exported = JSON.parse(
    await readFile(
      new URL("./photo-results/export.json", import.meta.url),
      "utf8",
    ),
  );
  if (JSON.stringify(exported.names) !== JSON.stringify(result.names))
    throw new Error("UI export differs from recognition result");
  const truth = JSON.parse(
    await readFile(
      new URL("./photo-ground-truth.json", import.meta.url),
      "utf8",
    ),
  );
  const metrics = evaluatePhoto(result.candidates, truth);
  metrics.nameRecall = metrics.uniqueCorrect / metrics.uniqueTotal;
  metrics.meetsNameTarget =
    metrics.nameRecall >= 0.95 && metrics.falsePositives.length === 0;
  const metadata = {
    date: new Date().toISOString(),
    browser: browser.version(),
    platform: process.platform,
    arch: process.arch,
    imageSha256: createHash("sha256")
      .update(await readFile(new URL("./res/IMG_8535.jpeg", import.meta.url)))
      .digest("hex"),
    catalogSize: JSON.parse(
      await readFile(new URL("./res/card-names.json", import.meta.url), "utf8"),
    ).length,
    photoUploads: requests.filter((r) => !["GET", "HEAD"].includes(r.method)),
    pageErrors: errors,
  };
  await mkdir(new URL("./photo-results/", import.meta.url), {
    recursive: true,
  });
  const report = { metadata, metrics, ...result };
  await writeFile(
    new URL("./photo-results/final.json", import.meta.url),
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        names: result.names,
        nameRecall: metrics.nameRecall,
        readableTitles: `${metrics.fullCorrect}/${metrics.fullTotal}`,
        knownInstances: `${metrics.correct}/${truth.cards.length}`,
        falsePositives: metrics.falsePositives.length,
        seconds: result.totalMs / 1000,
        meetsNameTarget: metrics.meetsNameTarget,
        photoUploads: metadata.photoUploads.length,
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
  if (metadata.photoUploads.length || errors.length)
    throw new Error("Browser/privacy validation failed");
  if (process.argv.includes("--require-target") && !metrics.meetsNameTarget)
    process.exitCode = 1;
} finally {
  await browser?.close();
  await server.close();
}
