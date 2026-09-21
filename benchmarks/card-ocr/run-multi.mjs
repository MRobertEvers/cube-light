import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4173/');
await page.waitForFunction(() => typeof window.runMultiCard === 'function');
const all = [];
for (const [engine, tiled] of [['tesseract', false], ['paddle', false], ['tesseract', true], ['paddle', true]]) {
  console.log(`Running ${engine} ${tiled ? 'tiled' : 'full'}`);
  try {
    const result = await page.evaluate((args) => {
      const { engine, tiled } = args;
      return window.runMultiCard(engine, tiled);
    }, { engine, tiled });
    all.push(result);
    console.log(`Done in ${result.outputs.reduce((sum, item) => sum + item.ms, 0).toFixed(0)} ms`);
  } catch (error) {
    all.push({ engine, tiled, error: String(error) });
    console.error(error);
  }
  await writeFile(new URL('./results-multi.json', import.meta.url), JSON.stringify(all, null, 2));
}
await browser.close();
