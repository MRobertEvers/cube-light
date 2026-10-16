// Pure browser/Node module. No photo labels, coordinates, or expected deck list.
/**
 * @param {string} text
 */
export function normalize(text) {
	return text
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}
/**
 * @param {string} s
 */
function grams(s) {
	const out = new Set();
	s = s.replaceAll(' ', '');
	for (let i = 0; i < s.length - 2; i++) out.add(s.slice(i, i + 3));
	return out;
}
/**
 * @param {string[]} names
 */
export function buildIndex(names) {
	const entries = Array.from(new Set(names))
		.filter((name) => !name.startsWith('A-'))
		.flatMap((name) =>
			[name].concat(name.includes(' // ') ? name.split(' // ') : []).map(
				(alias) => ({ name, key: normalize(alias) })
			)
		);
	const postings = new Map();
	entries.forEach((e, i) => {
		for (const g of grams(e.key)) {
			if (!postings.has(g)) postings.set(g, []);
			postings.get(g).push(i);
		}
	});
	return { entries, postings };
}
/**
 * @param {string} a
 * @param {string} b
 */
function distance(a, b) {
	let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i++) {
		const row = [i];
		for (let j = 1; j <= b.length; j++)
			row[j] = Math.min(
				row[j - 1] + 1,
				prev[j] + 1,
				prev[j - 1] + (a[i - 1] !== b[j - 1])
			);
		prev = row;
	}
	return prev[b.length];
}
/**
 * @param {string} text
 * @param {import('./types.js').NameIndex} index
 */
export function rankNames(text, index) {
	// Arena shortens long names with an ellipsis; what is left must start the name.
	const cut = text.search(/\.\.\.|…/),
		truncated = cut >= 0,
		key = normalize(truncated ? text.slice(0, cut) : text);
	if (key.length < 3 || key.length > 55) return [];
	const shared = new Map();
	for (const g of grams(key))
		for (const id of index.postings.get(g) || [])
			shared.set(id, (shared.get(id) || 0) + 1);
	const byName = new Map();
	for (const [id] of Array.from(shared).sort((a, b) => b[1] - a[1]).slice(0, 180)) {
		const e = index.entries[id];
		if (truncated ? e.key.length <= key.length :
			Math.abs(e.key.length - key.length) > Math.max(8, key.length * 0.5))
			continue;
		const target = truncated ? e.key.slice(0, key.length) : e.key,
			score =
				1 - distance(key, target) / Math.max(key.length, target.length);
		if (score > (byName.get(e.name)?.score ?? -1))
			byName.set(e.name, { name: e.name, score, exact: key === e.key });
	}
	return Array.from(byName.values()).sort((a, b) => b.score - a.score).slice(0, 3);
}
/**
 * @param {import('./types.js').Polygon} poly
 */
export function bounds(poly) {
	const xs = poly.map((p) => p[0]),
		ys = poly.map((p) => p[1]);
	return {
		x: Math.min.apply(null, xs),
		y: Math.min.apply(null, ys),
		w: Math.max.apply(null, xs) - Math.min.apply(null, xs),
		h: Math.max.apply(null, ys) - Math.min.apply(null, ys)
	};
}
/**
 * @param {import('./types.js').Bounds} a
 * @param {import('./types.js').Bounds} b
 */
export function sameLine(a, b) {
	const ac = [a.x + a.w / 2, a.y + a.h / 2],
		bc = [b.x + b.w / 2, b.y + b.h / 2];
	return (
		Math.abs(ac[0] - bc[0]) < Math.max(a.w, b.w) * 0.48 &&
		Math.abs(ac[1] - bc[1]) < Math.max(10, Math.min(a.h, b.h) * 0.55)
	);
}
const NON_TITLE =
	/^(?:when|whenever|if |you |your |target |this |that |the |may |pay |sacrifice |counter |creature\b|artifact\b|instant\b|sorcery\b|enchantment\b|flying\b|affinity\b|improvise\b|sometimes\b|equip\b)/i;
/**
 * @param {Array<{items: import('./types.js').TextDetection[]}>} outputs
 * @param {import('./types.js').NameIndex} index
 */
export function matchDetections(outputs, index) {
	const candidates = [];
	for (const item of outputs.flatMap((o) => o.items)) {
		// Deck lists put the count before the name: "4x Fell".
		const text = item.text
			.trim()
			.replace(/^\d{1,2}\s*[xX×][\s(\[|]+(?=[A-Za-z])/, '');
		if (item.score < 0.45 || NON_TITLE.test(text) || /[()]/.test(text))
			continue;
		const ranked = rankNames(text, index);
		const best = ranked[0],
			short = normalize(text).length < 8;
		if (!best || best.score < 0.58 || (short && !best.exact)) continue;
		const margin = best.score - (ranked[1]?.score || 0);
		const accepted =
			best.score >= 0.84 &&
			item.score >= 0.75 &&
			(best.exact || /^[A-Z]/.test(text)) &&
			(best.exact || margin >= 0.12) &&
			!short;
		const candidate = {
			text,
			ocrScore: item.score,
			name: best.name,
			similarity: best.score,
			margin,
			status: accepted ? 'accepted' : 'review',
			alternatives: ranked,
			poly: item.poly,
			box: bounds(item.poly),
			// A short name such as "Fell" matches too much rules text on its own.
			shortExact: short && item.score >= 0.95
		};
		const duplicate = candidates.find((c) =>
			sameLine(c.box, candidate.box)
		);
		if (duplicate) {
			function priority(c) {
				return (
					(c.status === 'accepted' ? 10 : 0) +
					c.similarity +
					c.ocrScore * 0.01
				);
			}
			if (priority(candidate) > priority(duplicate))
				Object.assign(duplicate, candidate);
		} else candidates.push(candidate);
	}
	acceptListRows(candidates);
	return candidates.sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
}
/**
 * A deck list stacks names in one column at one height. A short exact name
 * counts when it lines up with at least two accepted names that way.
 * @param {Array<{status: string, shortExact: boolean, box: import('./types.js').Bounds}>} candidates
 */
function acceptListRows(candidates) {
	const accepted = candidates.filter((c) => c.status === 'accepted');
	for (const c of candidates) {
		if (c.status === 'accepted' || !c.shortExact) continue;
		const column = accepted.filter(
			(other) =>
				Math.abs(other.box.x - c.box.x) < c.box.h &&
				Math.min(other.box.h, c.box.h) / Math.max(other.box.h, c.box.h) >
					0.75 &&
				Math.abs(other.box.y - c.box.y) < c.box.h * 4
		);
		if (column.length >= 2) c.status = 'accepted';
	}
}
