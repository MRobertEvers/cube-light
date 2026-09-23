import { CardListLintWasm } from '../../platform/wasm/card-list-lint-wasm';
import { locateCardName, parseCardList } from '../../domain/card-names/parse-card-list';
import type { CardListProblem } from '../../domain/card-names/card-list-problem';
import type { CardListLintRequest, CardListLintResponse } from './card-list-lint.protocol';

const SUGGESTIONS = 3;
const COMPLETIONS = 8;

function post(message: CardListLintResponse) {
	return (self as unknown as Worker).postMessage(message);
}

let acceptIndex: (bytes: ArrayBuffer) => void;
const indexReady = new Promise<ArrayBuffer>((resolve) => { acceptIndex = resolve; });
// Domain/catalog bytes arrive from the window's Redux/core path. Only static WASM is fetched here.
const lint = (async function () {
	const [moduleResponse, indexBytes] = await Promise.all([
		fetch(new URL('../../platform/wasm/card-list-lint.wasm', import.meta.url)),
		indexReady
	]);
	if (!moduleResponse.ok)
		throw new Error('Could not download the card name index.');
	const moduleBytes = await moduleResponse.arrayBuffer();
	return CardListLintWasm.create(moduleBytes, new Uint8Array(indexBytes));
})();
lint.then(
	() => post({ kind: 'ready' }),
	(error) =>
		post({
			kind: 'failed',
			error: error instanceof Error ? error.message : String(error)
		})
);

// Lists are re-analysed on every edit, so per-name verdicts are cached; null means known.
const verdicts = new Map<string, string[] | null>();
function verdict(checker: CardListLintWasm, name: string): string[] | null {
	const key = name.toLowerCase();
	let result = verdicts.get(key);
	if (result === undefined) {
		result = checker.find(name)
			? null
			: checker.suggest(name, SUGGESTIONS).map((options) => {
					const { name } = options;
					return name;
				});
		if (verdicts.size > 5000) verdicts.clear();
		verdicts.set(key, result);
	}
	return result;
}

function analyze(checker: CardListLintWasm, text: string): CardListProblem[] {
	const lines = text.split(/\r?\n/);
	const problems: CardListProblem[] = [];
	// parseCardList decides which lines are cards (maybeboards, comments and headers are not).
	for (const card of parseCardList(text).cards) {
		const suggestions = verdict(checker, card.name);
		if (!suggestions) continue;
		for (const line of card.lines) {
			const lineText = lines[line - 1];
			const span = locateCardName(lineText);
			if (!span) continue;
			problems.push({
				line,
				lineText,
				name: span.name,
				start: span.start,
				end: span.end,
				suggestions
			});
		}
	}
	return problems.sort((a, b) => a.line - b.line);
}

// Only the newest analysis matters; older ones queued behind the index download are dropped.
let latestAnalysis = 0;

self.addEventListener(
	'message',
	async (event: MessageEvent<CardListLintRequest>) => {
		const request = event.data;
		if (request.kind === 'initialize') { acceptIndex(request.indexBytes); return; }
		if (request.kind === 'analyze') latestAnalysis = request.id;
		let checker: CardListLintWasm;
		try {
			checker = await lint;
		} catch {
			return; // Reported once through 'failed'.
		}
		if (request.kind === 'analyze') {
			if (request.id !== latestAnalysis) return;
			post({
				kind: 'analysis',
				id: request.id,
				text: request.text,
				problems: analyze(checker, request.text)
			});
		} else {
			post({
				kind: 'completions',
				id: request.id,
				query: request.query,
				names: checker.complete(request.query, COMPLETIONS)
			});
		}
	}
);
