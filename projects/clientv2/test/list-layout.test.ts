import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	acceptCountedLines,
	attachCounts,
	countCrop,
	countToken,
	countTokens,
	cropCount,
	needsCountRead,
	detectLayout,
	parseLine
} from '../src/platform/card-scanner/list-layout.js';
import { buildIndex, matchDetections } from '../src/platform/card-scanner/photo-match.js';

test('a count before or after the name is split off', () => {
	assert.deepEqual(parseLine('4x( Iridescent Vinelasher'), {
		text: 'Iridescent Vinelasher',
		count: { value: 4, side: 'left', marked: true, from: 'line' }
	});
	assert.deepEqual(parseLine('4 Lightning Bolt'), {
		text: 'Lightning Bolt',
		count: { value: 4, side: 'left', marked: false, from: 'line' }
	});
	assert.deepEqual(parseLine('x2 Counterspell'), {
		text: 'Counterspell',
		count: { value: 2, side: 'left', marked: true, from: 'line' }
	});
	assert.deepEqual(parseLine('Lightning Bolt x4'), {
		text: 'Lightning Bolt',
		count: { value: 4, side: 'right', marked: true, from: 'line' }
	});
	assert.deepEqual(parseLine('Counterspell 3'), {
		text: 'Counterspell',
		count: { value: 3, side: 'right', marked: false, from: 'line' }
	});
	assert.deepEqual(parseLine('Llanowar Elves (2)'), {
		text: 'Llanowar Elves',
		count: { value: 2, side: 'right', marked: false, from: 'line' }
	});
});

test('names with digits of their own keep them', () => {
	assert.deepEqual(parseLine('1996 World Champion'), { text: '1996 World Champion', count: null });
	assert.deepEqual(parseLine('Fell'), { text: 'Fell', count: null });
	assert.equal(parseLine('0 Fell').count, null);
});

test('count-only text is a token; mana and power are not', () => {
	assert.deepEqual(countToken('4X'), { value: 4, marked: true });
	assert.deepEqual(countToken('2x('), { value: 2, marked: true });
	assert.deepEqual(countToken('3'), { value: 3, marked: false });
	assert.equal(countToken('2/2'), null);
	assert.equal(countToken('①'), null);
	assert.equal(countToken('60/60 Cards'), null);
});

const index = buildIndex(['Lightning Bolt', 'Counterspell', 'Llanowar Elves', 'Fell', 'Shivan Dragon', 'Serra Angel']);

/** A 40-pixel-tall text item at (x, y). */
function item(text: string, x: number, y: number, w: number, score = 0.98) {
	return { text, score, poly: [[x, y], [x + w, y], [x + w, y + 40], [x, y + 40]] };
}

test('lines with counts make a deck list; counts come from text or a token beside it', () => {
	const outputs = [{
		items: [
			item('4 Lightning Bolt', 100, 0, 400),
			item('2', 100, 60, 20),
			item('Counterspell', 140, 60, 300),
			item('Llanowar Elves x3', 100, 120, 420),
			item('1 Fell', 100, 180, 120)
		]
	}];
	const lines = matchDetections(outputs, index);
	attachCounts(lines, countTokens(outputs), null);
	assert.deepEqual(detectLayout(lines), { layout: 'list', side: 'left' });
	acceptCountedLines(lines);
	assert.deepEqual(
		lines.filter((c) => c.status === 'accepted').map((c) => [c.name, c.count?.value ?? 1]),
		[['Lightning Bolt', 4], ['Counterspell', 2], ['Llanowar Elves', 3], ['Fell', 1]]
	);
});

test('card titles with a mana cost beside them stay cards', () => {
	const outputs = [{
		items: [
			item('Shivan Dragon', 100, 0, 300),
			item('4', 450, 0, 20),
			item('Serra Angel', 600, 0, 260),
			item('3', 900, 0, 20),
			item('Lightning Bolt', 100, 500, 300),
			item('Counterspell', 600, 500, 260)
		]
	}];
	const lines = matchDetections(outputs, index);
	attachCounts(lines, countTokens(outputs), null);
	assert.equal(detectLayout(lines).layout, 'cards');
	assert.ok(lines.every((c) => c.count === null));
});

test('a handwritten close match is accepted when its line has a count', () => {
	const outputs = [{ items: [item('3 Lightnng bolt', 100, 0, 400, 0.6)] }];
	const [line] = matchDetections(outputs, index);
	assert.equal(line.status, 'review');
	acceptCountedLines([line]);
	assert.equal(line.status, 'accepted');
	assert.equal(line.count?.value, 3);
});

test('a re-read count is trusted bare, or with its x beside other text', () => {
	assert.deepEqual(cropCount('4x('), { value: 4, marked: true });
	assert.deepEqual(cropCount('20'), { value: 20, marked: false });
	assert.deepEqual(cropCount('a2xF'), { value: 2, marked: true });
	assert.equal(cropCount('Ae7'), null);
	assert.equal(cropCount('137'), null);
});

test('counts from a neighbouring text item are read again; counts in the line are not', () => {
	const box = { x: 700, y: 1500, w: 1300, h: 160 };
	const line = { status: 'accepted', similarity: 1, margin: 1, ocrScore: 1, alternatives: [], box, count: null };
	assert.ok(needsCountRead(line));
	assert.ok(needsCountRead(Object.assign({}, line, { count: { value: 11, side: 'left', marked: false, from: 'token' } })));
	assert.ok(!needsCountRead(Object.assign({}, line, { count: { value: 2, side: 'left', marked: true, from: 'line' } })));
	assert.deepEqual(countCrop(box, 'left', { width: 3000, height: 4000 }), { x: 412, y: 1476, w: 288, h: 208 });
	assert.deepEqual(countCrop(box, 'right', { width: 2100, height: 4000 }), { x: 2000, y: 1476, w: 100, h: 208 });
});
