// Pure browser/Node module. No photo labels, coordinates, or expected deck list.
export const normalize = (text) =>
	text
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
const grams = (s) => {
	const out = new Set();
	s = s.replaceAll(' ', '');
	for (let i = 0; i < s.length - 2; i++) out.add(s.slice(i, i + 3));
	return out;
};
export function buildIndex(names) {
	const entries = [...new Set(names)]
		.filter((name) => !name.startsWith('A-'))
		.flatMap((name) =>
			[name, ...(name.includes(' // ') ? name.split(' // ') : [])].map(
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
export function rankNames(text, index) {
	const key = normalize(text);
	if (key.length < 5 || key.length > 55) return [];
	const shared = new Map();
	for (const g of grams(key))
		for (const id of index.postings.get(g) || [])
			shared.set(id, (shared.get(id) || 0) + 1);
	const byName = new Map();
	for (const [id] of [...shared].sort((a, b) => b[1] - a[1]).slice(0, 180)) {
		const e = index.entries[id];
		if (Math.abs(e.key.length - key.length) > Math.max(8, key.length * 0.5))
			continue;
		const score =
			1 - distance(key, e.key) / Math.max(key.length, e.key.length);
		if (score > (byName.get(e.name)?.score ?? -1))
			byName.set(e.name, { name: e.name, score, exact: key === e.key });
	}
	return [...byName.values()].sort((a, b) => b.score - a.score).slice(0, 3);
}
export function bounds(poly) {
	const xs = poly.map((p) => p[0]),
		ys = poly.map((p) => p[1]);
	return {
		x: Math.min(...xs),
		y: Math.min(...ys),
		w: Math.max(...xs) - Math.min(...xs),
		h: Math.max(...ys) - Math.min(...ys)
	};
}
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
export function matchDetections(outputs, index) {
	const candidates = [];
	for (const item of outputs.flatMap((o) => o.items)) {
		const text = item.text.trim();
		if (item.score < 0.45 || NON_TITLE.test(text) || /[()]/.test(text))
			continue;
		const ranked = rankNames(text, index);
		const best = ranked[0];
		if (!best || best.score < 0.58) continue;
		const margin = best.score - (ranked[1]?.score || 0);
		const accepted =
			best.score >= 0.84 &&
			item.score >= 0.75 &&
			(best.exact || /^[A-Z]/.test(text)) &&
			(best.exact || margin >= 0.12) &&
			normalize(text).length >= 8;
		const candidate = {
			text,
			ocrScore: item.score,
			name: best.name,
			similarity: best.score,
			margin,
			status: accepted ? 'accepted' : 'review',
			alternatives: ranked,
			poly: item.poly,
			box: bounds(item.poly)
		};
		const duplicate = candidates.find((c) =>
			sameLine(c.box, candidate.box)
		);
		if (duplicate) {
			const priority = (c) =>
				(c.status === 'accepted' ? 10 : 0) +
				c.similarity +
				c.ocrScore * 0.01;
			if (priority(candidate) > priority(duplicate))
				Object.assign(duplicate, candidate);
		} else candidates.push(candidate);
	}
	return candidates.sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
}
