import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';

const truth = JSON.parse(await readFile(new URL('./multi-ground-truth.json', import.meta.url)));
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4173/');
await page.waitForFunction(() => typeof window.runMultiTitles === 'function');
const all = [];
for (const engine of ['tesseract', 'paddle']) {
  console.log(`Running ${engine} on ${truth.length} annotated titles`);
  try {
    const result = await page.evaluate((args) => {
      const { engine, truth } = args;
      return window.runMultiTitles(engine, truth);
    }, { engine, truth });
    all.push(result);
    console.log(`Done in ${result.outputs.reduce((sum, item) => sum + item.ms, 0).toFixed(0)} ms`);
  } catch (error) {
    all.push({ engine, error: String(error) });
    console.error(error);
  }
  await writeFile(new URL('./results-multi-titles.json', import.meta.url), JSON.stringify(all, null, 2));
}
await browser.close();
