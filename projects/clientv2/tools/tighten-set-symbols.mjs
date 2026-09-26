import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const OUT = path.resolve(import.meta.dirname, '../src/assets/set-symbols');

/**
 * Crops every symbol in the set symbol sprite to its drawn shapes, so symbols line up in
 * size: Scryfall's icons sit in boxes from tight to four times their size. Measures each
 * symbol's shapes in Chrome (getBBox) and rewrites its viewBox to them, then writes
 * set-symbol-sizes.json: icon id → [width, height] of its new viewBox, for fitting a
 * symbol to the set symbol's place on a card. Run after tools/vendor-set-symbols.mjs, or
 * alone: `node tools/tighten-set-symbols.mjs`.
 */
export async function tightenSetSymbols() {
	const spritePath = path.join(OUT, 'set-symbols.svg');
	const sprite = await fs.readFile(spritePath, 'utf8');
	const browser = await chromium.launch({ channel: 'chrome', headless: true });
	try {
		const page = await browser.newPage();
		const boxes = await page.evaluate(function (source) {
			const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
			const found = {};
			for (const symbol of Array.from(doc.querySelectorAll('symbol'))) {
				const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
				group.innerHTML = symbol.innerHTML;
				svg.appendChild(group);
				document.body.appendChild(svg);
				const box = group.getBBox();
				found[symbol.id] = [box.x, box.y, box.width, box.height];
				svg.remove();
			}
			return found;
		}, sprite);
		const sizes = {};
		const tightened = sprite.replace(/<symbol id="([^"]+)" viewBox="[^"]*">/g, function (whole, id) {
			const box = boxes[id];
			if (!box || box[2] <= 0 || box[3] <= 0) return whole;
			const numbers = box.map(function (value) {
				return Number(value.toFixed(1));
			});
			sizes[id] = [numbers[2], numbers[3]];
			return `<symbol id="${id}" viewBox="${numbers.join(' ')}">`;
		});
		await fs.writeFile(spritePath, tightened);
		const sorted = Object.fromEntries(Object.keys(sizes).sort().map((id) => [id, sizes[id]]));
		await fs.writeFile(path.join(OUT, 'set-symbol-sizes.json'), JSON.stringify(sorted) + '\n');
		console.log(`Cropped ${Object.keys(sizes).length} set symbols to their shapes`);
	} finally {
		await browser.close();
	}
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await tightenSetSymbols();
