/**
 * Vendors every set's expansion symbol from Scryfall into one SVG sprite, so rendered
 * cards can show them with no network: `node tools/vendor-set-symbols.mjs`.
 *
 * Writes src/assets/set-symbols/:
 * - set-symbols.svg: one <symbol id="<icon>"> per distinct icon, fills removed so CSS can
 *   color them by rarity, and path numbers rounded to what a small symbol can show.
 * - set-icons.json: lower-case set code → icon id. Many sets (promos, tokens) share one.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve(import.meta.dirname, '../src/assets/set-symbols');
const HEADERS = { 'User-Agent': 'ToriMTG/1.0', Accept: 'application/json;q=0.9,*/*;q=0.8' };
// Scryfall asks for 50–100 ms between requests.
const DELAY_MS = 80;

function iconId(uri) {
	return new URL(uri).pathname.split('/').pop().replace(/\.svg$/, '');
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const NUMBER = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/i;
const ARGUMENTS = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };

function rounded(number, decimals) {
	return String(Number(Number(number).toFixed(decimals)));
}

/**
 * Path data with every number rounded to `decimals` places. Paths run numbers together
 * ("1.5.5", arc flags as "011"), so it is read token by token: an arc's two flags are
 * single digits.
 */
function roundPath(d, decimals) {
	let out = '';
	let command = '';
	let argument = 0;
	let rest = d.trim();
	while (rest) {
		rest = rest.replace(/^[\s,]+/, '');
		if (!rest) break;
		if (/^[a-z]/i.test(rest)) {
			command = rest[0];
			argument = 0;
			out += command;
			rest = rest.slice(1);
			continue;
		}
		const count = ARGUMENTS[command.toLowerCase()];
		const flag = command.toLowerCase() === 'a' && (argument % count === 3 || argument % count === 4);
		const token = flag ? rest[0] : NUMBER.exec(rest)?.[0];
		if (!token) throw new Error(`Unreadable path data at "${rest.slice(0, 20)}"`);
		const value = flag ? token : rounded(token, decimals);
		// A separator only where the next number would otherwise run into the last.
		if (argument > 0 && !value.startsWith('-')) out += ' ';
		out += value;
		argument += 1;
		rest = rest.slice(token.length);
	}
	return out;
}

function roundNumbers(text, decimals) {
	return text.replace(/-?(?:\d+\.?\d*|\.\d+)/g, function (number) {
		return rounded(number, decimals);
	});
}

/** An icon's SVG as a <symbol>: its viewBox and shapes, without fills or titles. */
function toSymbol(id, svg) {
	const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1];
	if (!viewBox) throw new Error(`${id} has no viewBox`);
	const box = viewBox.split(/[\s,]+/).map(Number);
	const size = Math.max(box[2], box[3]);
	// A ten-thousandth of the symbol, so rounding relative steps cannot drift visibly.
	const decimals = Math.max(0, Math.ceil(-Math.log10(size / 10000)));
	const body = svg
		.replace(/^[\s\S]*?<svg[^>]*>/, '')
		.replace(/<\/svg>\s*$/, '')
		.replace(/<title>[\s\S]*?<\/title>/g, '')
		.replace(/\sfill="(?!none)[^"]*"/g, '')
		.replace(/\sd="([^"]*)"/g, function (whole, value) {
			return ` d="${roundPath(value, decimals)}"`;
		})
		.replace(/\s(transform|points)="([^"]*)"/g, function (whole, name, value) {
			return ` ${name}="${roundNumbers(value, decimals).replace(/\s+/g, ' ').trim()}"`;
		})
		.replace(/>\s+</g, '><')
		.trim();
	return `<symbol id="${id}" viewBox="${viewBox}">${body}</symbol>`;
}

async function main() {
	const sets = (await (await fetch('https://api.scryfall.com/sets', { headers: HEADERS })).json()).data;
	const icons = new Map();
	const setIcons = {};
	for (const set of sets) {
		const id = iconId(set.icon_svg_uri);
		setIcons[set.code] = id;
		icons.set(id, set.icon_svg_uri.split('?')[0]);
	}

	const symbols = [];
	const missing = [];
	for (const [id, uri] of Array.from(icons).sort()) {
		const response = await fetch(uri, { headers: HEADERS });
		if (response.ok) symbols.push(toSymbol(id, await response.text()));
		else missing.push(id);
		await sleep(DELAY_MS);
	}
	// Sets whose icon Scryfall no longer serves show the generic one.
	for (const code of Object.keys(setIcons)) if (missing.includes(setIcons[code])) setIcons[code] = 'default';

	await fs.mkdir(OUT, { recursive: true });
	await fs.writeFile(path.join(OUT, 'set-symbols.svg'), `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join('')}</svg>\n`);
	const sorted = Object.fromEntries(Object.entries(setIcons).sort());
	await fs.writeFile(path.join(OUT, 'set-icons.json'), JSON.stringify(sorted) + '\n');
	console.log(`${symbols.length} icons for ${sets.length} sets${missing.length ? `; missing ${missing.join(', ')}` : ''}`);
}

await main();
