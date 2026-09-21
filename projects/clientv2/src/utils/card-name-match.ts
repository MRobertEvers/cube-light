export type PreparedCardName = {
	name: string;
	clean: string;
	length: number;
	words: number;
};
export type PreparedCardNames = {
	items: PreparedCardName[];
	exact: Map<string, string>;
	grams: Map<string, number[]>;
};

export function normalizeCardName(value: string): string {
	return value.normalize('NFKD').toLowerCase().replace(/[^a-z ]+/g, ' ')
		.split(/\s+/).filter((word) => word.length > 1 || word === 'a').join(' ');
}

function gramsFor(value: string): string[] {
	const compact = value.replaceAll(' ', '');
	const grams = new Set<string>();
	for (let i = 0; i <= compact.length - 3; i++) grams.add(compact.slice(i, i + 3));
	return [...grams];
}

export function prepareCardNames(names: string[]): PreparedCardNames {
	const entry = (name: string, alias: string): PreparedCardName => {
		const clean = normalizeCardName(alias);
		return { name, clean, length: clean.length, words: clean ? clean.split(' ').length : 0 };
	};
	// Standalone card names take precedence over the same text used as a face alias.
	const items = [
		...names.map((name) => entry(name, name)),
		...names.flatMap((name) => name.includes('//')
			? name.split('//').map((face) => entry(name, face.trim())) : [])
	].filter((item) => item.length >= 4);
	const exact = new Map<string, string>();
	const grams = new Map<string, number[]>();
	items.forEach((item, index) => {
		if (!exact.has(item.clean)) exact.set(item.clean, item.name);
		for (const gram of gramsFor(item.clean)) {
			const posting = grams.get(gram) ?? [];
			posting.push(index);
			grams.set(gram, posting);
		}
	});
	return { items, exact, grams };
}

function lcsLength(a: string, b: string): number {
	const previous = new Uint16Array(b.length + 1);
	const current = new Uint16Array(b.length + 1);
	for (let i = 1; i <= a.length; i++) {
		for (let j = 1; j <= b.length; j++) {
			current[j] = a[i - 1] === b[j - 1]
				? previous[j - 1] + 1 : Math.max(previous[j], current[j - 1]);
		}
		previous.set(current);
		current.fill(0);
	}
	return previous[b.length];
}

export function bestCardName(ocrText: string, names: PreparedCardNames): { name: string; score: number } | null {
	const clean = normalizeCardName(ocrText);
	if (clean.length < 4 || clean.length > 60) return null;
	const exact = names.exact.get(clean);
	if (exact) return { name: exact, score: 100 };
	const words = clean.split(' ').length;
	const maxLengthDifference = Math.max(5, clean.length * 0.4);
	const shared = new Map<number, number>();
	for (const gram of gramsFor(clean)) {
		for (const index of names.grams.get(gram) ?? []) {
			shared.set(index, (shared.get(index) ?? 0) + 1);
		}
	}
	const shortlist = [...shared.entries()].sort((a, b) => b[1] - a[1]).slice(0, 200);
	let best: { name: string; score: number } | null = null;
	for (const [index] of shortlist) {
		const candidate = names.items[index];
		if (Math.abs(candidate.length - clean.length) > maxLengthDifference) continue;
		if (Math.abs(candidate.words - words) > 2) continue;
		const score = 200 * lcsLength(clean, candidate.clean) / (clean.length + candidate.length);
		if (!best || score > best.score) best = { name: candidate.name, score };
	}
	return best;
}
