import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";
const b = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
try {
  const p = await b.newPage();
  await p.routeWebSocket("**/*", (ws) => {
    ws.onMessage(() => {});
    ws.send(JSON.stringify({ type: "connected" }));
  });
  p.on("console", (m) => {
    if (m.type() === "log") console.log(m.text());
  });
  p.on("pageerror", (e) => console.error(String(e)));
  await p.goto("http://127.0.0.1:4173/small-verifier.html");
  await p.waitForFunction(
    () => typeof window.compareSmallVerifiers === "function",
  );
  const r = await p.evaluate(() => window.compareSmallVerifiers());
  await writeFile(
    new URL("./photo-results/small-verifiers-v1.json", import.meta.url),
    JSON.stringify(r, null, 2),
  );
} finally {
  await b.close();
}
