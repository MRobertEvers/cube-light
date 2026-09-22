// CTC prefix beam search over the entire catalog. No fixture-specific names.
const alphabet = "abcdefghijklmnopqrstuvwxyz-,'æ ";
/**
 * @param {string} s
 */
function clean(s) {
	return s
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z\-',æ ]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}
/**
 * @param {number} a
 * @param {number} b
 */
function logadd(a, b) {
	return a === -Infinity
		? b
		: b === -Infinity
			? a
			: Math.max(a, b) + Math.log1p(Math.exp(-Math.abs(a - b)));
}
/**
 * @param {string[]} names
 */
export function makeLexicon(names) {
	const nodes = [{ next: new Map(), length: 0, char: -1, names: [] }];
	for (const name of names) {
		if (name.startsWith('A-')) continue;
		const key = clean(name);
		if (key.length < 4 || key.length > 50) continue;
		let id = 0;
		for (const ch of key) {
			const c = alphabet.indexOf(ch);
			if (!nodes[id].next.has(c)) {
				nodes[id].next.set(c, nodes.length);
				nodes.push({
					next: new Map(),
					length: nodes[id].length + 1,
					char: c,
					names: []
				});
			}
			id = nodes[id].next.get(c);
		}
		nodes[id].names.push(name);
	}
	return nodes;
}
/**
 * @typedef {Object} LexiconOptions
 * @property {number} [beamWidth]
 * @property {number} [bonus]
 * @property {number} [skip]
 * @property {number} [blankIndex]
 *
 * @param {ArrayLike<number>} probabilities
 * @param {number} steps
 * @param {string[]} sourceChars
 * @param {ReturnType<typeof makeLexicon>} nodes
 * @param {LexiconOptions} [options]
 */
export function decodeLexicon(
	probabilities,
	steps,
	sourceChars,
	nodes,
	options
) {
	const {
		beamWidth = 160,
		bonus = 0.2,
		skip = 2,
		blankIndex = sourceChars.length - 1
	} = options === undefined ? {} : options;

	const classes = sourceChars.length,
		blank = blankIndex,
		groups = Array.from({ length: alphabet.length }, () => []);
	for (let i = 0; i < classes; i++) {
		if (i === blank) continue;
		const c = alphabet.indexOf(sourceChars[i].toLowerCase());
		if (c >= 0) groups[c].push(i);
	}
	let beam = [{ id: 0, b: 0, n: -Infinity, total: 0 }];
	for (let t = skip; t < steps; t++) {
		const p = groups.map((ids) =>
			Math.log(
				Math.max(
					1e-12,
					ids.reduce((s, i) => s + probabilities[t * classes + i], 0)
				)
			)
		);
		const pb = Math.log(
				Math.max(1e-12, probabilities[t * classes + blank])
			),
			next = new Map();
		function entry(id) {
			let r = next.get(id);
			if (!r) {
				r = { id, b: -Infinity, n: -Infinity };
				next.set(id, r);
			}
			return r;
		}
		for (const state of beam) {
			const node = nodes[state.id],
				same = entry(state.id);
			same.b = logadd(same.b, state.total + pb);
			if (node.char >= 0) same.n = logadd(same.n, state.n + p[node.char]);
			for (const [c, id] of node.next) {
				const out = entry(id),
					from = c === node.char ? state.b : state.total;
				out.n = logadd(out.n, from + p[c]);
			}
		}
		beam = [...next.values()]
			.map((r) => ({ ...r, total: logadd(r.b, r.n) }))
			.sort(
				(a, b) =>
					b.total +
					nodes[b.id].length * bonus -
					(a.total + nodes[a.id].length * bonus)
			)
			.slice(0, beamWidth);
	}
	return beam
		.filter((b) => nodes[b.id].names.length)
		.flatMap((b) =>
			nodes[b.id].names.map((name) => ({
				name,
				logProbability: b.total,
				perCharacter: Math.exp(b.total / nodes[b.id].length)
			}))
		)
		.sort((a, b) => b.logProbability - a.logProbability)
		.slice(0, 5);
}
