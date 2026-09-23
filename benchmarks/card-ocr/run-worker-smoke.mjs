import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
});
try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    const OriginalWorker = window.Worker;
    window.__workerUrls = [];
    window.Worker = class extends OriginalWorker {
      constructor(scriptURL, options) {
        super(scriptURL, options);
        window.__workerUrls.push(String(scriptURL));
      }
    };
  });
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForFunction(() => typeof window.runWorkerModeSmoke === 'function');
  const result = await page.evaluate(async () => ({
    lines: await window.runWorkerModeSmoke(),
    workerUrls: window.__workerUrls
  }));
  assert.ok(result.workerUrls.some((url) => url.includes('worker-entry')), 'PaddleOCR did not create its worker');
  assert.ok(result.lines.some((line) => line.includes('Lightning Bolt')), 'Worker OCR missed the sample card');
  console.log('PaddleOCR worker created and recognized Lightning Bolt.');
} finally {
  await browser.close();
}
