// Pure browser/Node module: tells a deck list from cards and reads its counts.
import { bounds } from './photo-match.js';

/**
 * A count written beside a name: "4", "4x", "x4". `marked` when it has the x,
 * which a mana cost or stray digit does not. `from` says how it was read: in
 * the name's own text, as a separate text item beside it, or by re-reading
 * the spot beside the name.
 * @typedef {{value: number, side: 'left'|'right', marked: boolean, from: 'line'|'token'|'crop'}} LineCount
 */

const LEADING =
		/^(?:(\d{1,2})\s*(?:([xX×])[\s(\[|.):-]*|[\s(\[|.):-]+)|([xX×])\s*(\d{1,2})[\s(\[|.):-]+)(?=[A-Za-z"'])/,
	TRAILING =
		/[\s(\[|,-]+(?:([xX×])\s*(\d{1,2})|(\d{1,2})\s*([xX×])?)\)?$/,
	TOKEN = /^(?:([xX×])\s*)?(\d{1,2})\s*([xX×])?\s*[.):(\[|]?$/;

/**
 * @param {string} digits
 */
function countValue(digits) {
	const value = Number(digits);
	return value >= 1 && value <= 99 ? value : null;
}

/**
 * Splits a count written on the same text line off the name.
 * @param {string} text
 * @returns {{text: string, count: LineCount|null}}
 */
export function parseLine(text) {
	const trimmed = text.trim(),
		lead = LEADING.exec(trimmed);
	if (lead) {
		const value = countValue(lead[1] ?? lead[4]);
		if (value !== null)
			return {
				text: trimmed.slice(lead[0].length),
				count: {
					value,
					side: 'left',
					marked: !!(lead[2] || lead[3]),
					from: 'line'
				}
			};
	}
	const trail = TRAILING.exec(trimmed);
	if (trail && trail.index > 0) {
		const value = countValue(trail[2] ?? trail[3]);
		if (value !== null)
			return {
				text: trimmed.slice(0, trail.index),
				count: {
					value,
					side: 'right',
					marked: !!(trail[1] || trail[4]),
					from: 'line'
				}
			};
	}
	return { text: trimmed, count: null };
}

/**
 * A text item that is only a count, such as Arena's "4x" badge.
 * @param {string} text
 * @returns {{value: number, marked: boolean}|null}
 */
export function countToken(text) {
	const match = TOKEN.exec(text.trim());
	if (!match) return null;
	const value = countValue(match[2]);
	return value === null ? null : { value, marked: !!(match[1] || match[3]) };
}

/**
 * Count-only text items, in image coordinates.
 * @param {Array<{items: import('./types.js').TextDetection[]}>} outputs
 */
export function countTokens(outputs) {
	const tokens = [];
	for (const item of outputs.flatMap((o) => o.items)) {
		const count = countToken(item.text);
		if (count && item.score >= 0.5)
			tokens.push({
				value: count.value,
				marked: count.marked,
				box: bounds(item.poly)
			});
	}
	return tokens;
}

/**
 * The count token beside a name's row on `side`, nearest first.
 * @param {import('./types.js').Bounds} box
 * @param {Array<{value: number, marked: boolean, box: import('./types.js').Bounds}>} tokens
 * @param {'left'|'right'} side
 * @returns {LineCount|null}
 */
export function adjacentCount(box, tokens, side) {
	const cy = box.y + box.h / 2;
	let best = null,
		bestGap = Infinity;
	for (const token of tokens) {
		const ty = token.box.y + token.box.h / 2;
		if (Math.abs(ty - cy) > box.h * 0.5) continue;
		const gap =
			side === 'left'
				? box.x - (token.box.x + token.box.w)
				: token.box.x - (box.x + box.w);
		if (gap < -box.h * 0.3 || gap > box.h * 3 || gap >= bestGap) continue;
		best = token;
		bestGap = gap;
	}
	return best
		? { value: best.value, side, marked: best.marked, from: 'token' }
		: null;
}

/**
 * @typedef {Object} LineCandidate
 * @property {string} status
 * @property {number} similarity
 * @property {number} margin
 * @property {number} ocrScore
 * @property {import('./types.js').NameMatch[]} alternatives
 * @property {import('./types.js').Bounds} box
 * @property {LineCount|null} count
 */

/**
 * A name line worth considering: accepted, or a close match still in review.
 * @param {LineCandidate} c
 */
function isLine(c) {
	return c.status === 'accepted' || c.similarity >= 0.75;
}

/**
 * Gives each line the count beside it, from its own text or a separate token.
 * Only a marked count may come from the right of a separate token, since a
 * card's mana cost sits there.
 * @param {LineCandidate[]} candidates
 * @param {Array<{value: number, marked: boolean, box: import('./types.js').Bounds}>} tokens
 * @param {'left'|'right'|null} side The list's known count side, if any.
 */
export function attachCounts(candidates, tokens, side) {
	for (const c of candidates) {
		if (c.count || !isLine(c)) continue;
		const left = side !== 'right' ? adjacentCount(c.box, tokens, 'left') : null,
			right =
				side !== 'left' ? adjacentCount(c.box, tokens, 'right') : null;
		c.count = left || (right && (right.marked || side === 'right') ? right : null);
	}
}

/**
 * A deck list when enough name lines carry a count.
 * @param {LineCandidate[]} candidates
 * @returns {{layout: 'cards'|'list', side: 'left'|'right'|null}}
 */
export function detectLayout(candidates) {
	const lines = candidates.filter(isLine),
		counted = lines.filter((c) => c.count);
	if (counted.length < 3 || counted.length < lines.length * 0.4)
		return { layout: 'cards', side: null };
	const left = counted.filter((c) => c.count.side === 'left').length;
	return {
		layout: 'list',
		side: left * 2 >= counted.length ? 'left' : 'right'
	};
}

/**
 * A line whose count should be read again: a separate text item can be a
 * misread neighbour, while a count in the name's own text is not.
 * @param {LineCandidate} c
 */
export function needsCountRead(c) {
	return isLine(c) && (!c.count || c.count.from === 'token');
}

/**
 * The spot beside a name where its count is written.
 * @param {import('./types.js').Bounds} box
 * @param {'left'|'right'} side
 * @param {{width: number, height: number}} image
 * @returns {import('./types.js').Bounds|null}
 */
export function countCrop(box, side, image) {
	const x0 = Math.max(
			0,
			Math.round(side === 'left' ? box.x - box.h * 1.8 : box.x + box.w)
		),
		x1 = Math.min(
			image.width,
			Math.round(side === 'left' ? box.x : box.x + box.w + box.h * 1.8)
		),
		y0 = Math.max(0, Math.round(box.y - box.h * 0.15)),
		y1 = Math.min(image.height, Math.round(box.y + box.h * 1.15));
	return x1 - x0 < 8 || y1 - y0 < 8
		? null
		: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * The count in the text read from a count crop. Beside other text, only a
 * count with its x is trusted.
 * @param {string} text
 * @returns {{value: number, marked: boolean}|null}
 */
export function cropCount(text) {
	const token = countToken(text);
	if (token) return token;
	const match = /(?:^|[^\d])(?:(\d{1,2})\s*[xX×]|[xX×]\s*(\d{1,2}))(?![\d])/.exec(
		text
	);
	if (!match) return null;
	const value = countValue(match[1] ?? match[2]);
	return value === null ? null : { value, marked: true };
}

/**
 * In a list, a counted line is a list entry even in handwriting: accept a
 * close match there that a card title would need more evidence for.
 * @param {LineCandidate[]} candidates
 */
export function acceptCountedLines(candidates) {
	for (const c of candidates) {
		if (c.status === 'accepted' || !c.count) continue;
		const exact = c.alternatives[0]?.exact;
		if (
			c.similarity >= 0.75 &&
			c.ocrScore >= 0.5 &&
			(exact || c.margin >= 0.08)
		)
			c.status = 'accepted';
	}
}
