import { chromium } from "playwright";
import { writeFile, readFile } from "node:fs/promises";
import { evaluatePhoto } from "./evaluate-photo.js";
const args = Object.fromEntries(process.argv.slice(2).map((x) => x.split("="))),
  id = args.id || "fresh-integrated-v1",
  browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  }),
  requests = [],
  blocked = [];
try {
  const p = await browser.newPage();
  await p.routeWebSocket("**/*", (ws) => {
    ws.onMessage(() => {});
    ws.send(JSON.stringify({ type: "connected" }));
  });
  for (const route of ["**/photo-results/**", "**/photo-ground-truth.json"])
    await p.route(route, (r) => {
      blocked.push(r.request().url());
      return r.abort();
    });
  p.on("request", (r) => {
    if (!["GET", "HEAD"].includes(r.method()))
      requests.push({ url: r.url(), method: r.method() });
  });
  p.on("console", (m) => {
    if (m.type() !== "error") console.log(m.text());
  });
  p.on("pageerror", (e) => console.error(String(e)));
  await p.exposeFunction("checkpoint", async (stage, data) => {
    await writeFile(
      new URL(`./photo-results/${id}-${stage}.json`, import.meta.url),
      JSON.stringify(data),
    );
    console.log(
      "Checkpoint",
      stage,
      data.candidates?.map((c) => c.name),
    );
  });
  await p.goto("http://127.0.0.1:4173/experimental-scanner.html");
  await p.waitForFunction(() => typeof window.scanExperimental === "function");
  const r = await p.evaluate(() =>
    window.scanExperimental({
      onProgress: (p) => console.log(p.phase, p.completed ?? "", p.total ?? ""),
      onStage: window.checkpoint,
    }),
  );
  const truth = JSON.parse(
    await readFile(
      new URL("./photo-ground-truth.json", import.meta.url),
      "utf8",
    ),
  );
  r.metrics = evaluatePhoto(r.candidates, truth);
  r.environment = {browser: await browser.version(),platform:process.platform,arch:process.arch};
  r.audit = { nonReadRequests: requests, blockedFixtureRequests: blocked };
  r.meetsTarget =
    r.metrics.uniqueCorrect === r.metrics.uniqueTotal &&
    r.metrics.falsePositives.length === 0 &&
    !requests.length &&
    !blocked.length;
  if (process.argv.includes("--require-target") && !r.meetsTarget)
    process.exitCode = 1;
  await writeFile(
    new URL(`./photo-results/${id}.json`, import.meta.url),
    JSON.stringify(r, null, 2),
  );
  console.log(
    "RESULT",
    JSON.stringify({
      names: r.names,
      ms: r.totalMs,
      correct: r.metrics.uniqueCorrect,
      false: r.metrics.falsePositives.map((c) => c.name),
      audit: r.audit,
    }),
  );
} finally {
  await browser.close();
}
