import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(new URL('./manifest.json', import.meta.url), 'utf8'));
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--enable-features=SharedArrayBuffer']
});
const page = await browser.newPage();
page.on('console', msg => console.log('browser:', msg.type(), msg.text()));
page.on('pageerror', error => console.error('browser error:', error));
await page.goto('http://127.0.0.1:4173/');
await page.waitForFunction(() => typeof window.runBenchmark === 'function');
const all = [];
const cases = process.argv.includes('--photo')
  ? [['tesseract', 'photo'], ['paddle', 'photo']]
  : process.argv.includes('--more')
    ? [['tesseract', 'tight'], ['paddle', 'tight'], ['tesseract', 'small'], ['paddle', 'small']]
    : [['tesseract', 'crop'], ['tesseract', 'full'], ['paddle', 'crop'], ['paddle', 'full']];
for (const [engine, mode] of cases) {
  console.log(`Running ${engine} ${mode}`);
  try {
    const result = await page.evaluate((args) => {
      const { manifest, engine, mode } = args;
      return window.runBenchmark(manifest, engine, mode);
    }, { manifest, engine, mode });
    all.push(result);
    console.log(JSON.stringify(result));
  } catch (error) {
    all.push({engine, mode, error: String(error)});
    console.error(error);
  }
  const outputFile = process.argv.includes('--photo') ? './results-photo.json'
    : process.argv.includes('--more') ? './results-more.json' : './results.json';
  await writeFile(new URL(outputFile, import.meta.url), JSON.stringify(all, null, 2));
}
await browser.close();
