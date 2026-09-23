import type { CardEdit, DeckBoard } from '@torimtg/core';
import type { LocalReader } from '../core/local-reader';
import type { CardListLinter, CardNameIndex, CardNameIndexBuilder, CardNameSearch } from '../ports';
import type { CardListProblem } from '../../domain/card-names/card-list-problem';
import type {
	CardPrinting,
	CardDetails,
	CardSuggestions
} from '../../domain/models/card';
import type { ImportedCard } from '../../domain/models/deck';

/** The main board is left implicit so its edits match those saved before boards existed. */
export function boardOf(board: DeckBoard | string | undefined): {
	board?: 'side';
} {
	return board === 'side' ? { board: 'side' } : {};
}

/** A card edit on `board`, leaving the main board implicit as `boardOf` does. */
export function cardEdit(
	uuid: string,
	action: CardEdit['action'],
	count: number,
	board: DeckBoard | string | undefined
): CardEdit {
	const edit: CardEdit = { uuid, action, count };
	if (board === 'side') edit.board = 'side';
	return edit;
}

/** Card information: downloaded once, then answered from this device. */
export class CardApi {
	private readonly reader: LocalReader;
	private names: Promise<string[]> | null = null;
	private readonly indexBuilder: CardNameIndexBuilder;
	private readonly linter: CardListLinter;
	private lintReady: Promise<void> | null = null;
	private nameLookup: Promise<CardNameIndex> | null = null;
	private suggestionCursor: CardNameSearch | null = null;

	constructor(reader: LocalReader, indexBuilder: CardNameIndexBuilder, linter: CardListLinter) {
		this.reader = reader;
		this.indexBuilder = indexBuilder;
		this.linter = linter;
	}

	details(uuid: string): Promise<CardDetails> {
		return this.reader.json({ type: 'card.details', uuid });
	}

	printings(name: string): Promise<CardPrinting[]> {
		return this.reader.json({ type: 'card.printings', name });
	}

	/** The printing a card name (and optional set) refers to. */
	resolve(name: string, setCode?: string): Promise<{ uuid: string }> {
		const query: { type: 'card.resolve'; name: string; setCode?: string } = {
			type: 'card.resolve',
			name
		};
		if (setCode) query.setCode = setCode;
		return this.reader.json(query);
	}

	suggestions(stub: string): Promise<CardSuggestions> {
		return this.reader.json({ type: 'card.suggestions', stub });
	}

	/** Every card name. Loaded once; a failed load is retried by the next call. */
	allNames(): Promise<string[]> {
		if (!this.names) {
			const names = this.reader.json<string[]>({
				type: 'card.names',
				format: 'all'
			});
			names.catch(() => {
				if (this.names === names) this.names = null;
			});
			this.names = names;
		}
		return this.names;
	}

	/** The raw card-name index, for workers that build their own lookup from it. */
	private async nameIndexBytes(): Promise<ArrayBuffer> {
		const index = await this.reader.resource({
			type: 'card.names',
			format: 'index'
		});
		return index.body.arrayBuffer();
	}

	/** The card-name lookup. Built once; a failed build is retried by the next call. */
	nameIndex(): Promise<CardNameIndex> {
		if (!this.nameLookup) {
			const lookup = this.buildNameIndex();
			lookup.catch(() => {
				if (this.nameLookup === lookup) this.nameLookup = null;
			});
			this.nameLookup = lookup;
		}
		return this.nameLookup;
	}

	private async buildNameIndex(): Promise<CardNameIndex> {
		const [moduleResource, indexBytes] = await Promise.all([
			this.reader.resource({ type: 'card.names', format: 'wasm' }),
			this.nameIndexBytes()
		]);
		return this.indexBuilder.build(await moduleResource.body.arrayBuffer(), new Uint8Array(indexBytes));
	}

	/** Starts the card-list checker. Resolves once it can answer; a failure can be retried. */
	prepareListChecks(): Promise<void> {
		if (!this.lintReady) {
			const ready = this.nameIndexBytes().then((bytes) => this.linter.prepare(bytes));
			ready.catch(() => {
				if (this.lintReady === ready) this.lintReady = null;
			});
			this.lintReady = ready;
		}
		return this.lintReady;
	}

	/** Lines of a pasted list whose name is not a card, with suggestions for each. */
	async checkList(text: string): Promise<CardListProblem[]> {
		await this.prepareListChecks();
		return this.linter.analyze(text);
	}

	/** Card names completing what has been typed, for the list editor. */
	async completeName(query: string): Promise<string[]> {
		await this.prepareListChecks();
		return this.linter.complete(query);
	}

	/** Loads the name index ahead of the first search, so typing never waits for it. */
	async prepareNameSearch(): Promise<void> {
		await this.nameIndex();
	}

	/** Up to ten card names matching what has been typed so far, best first. */
	async suggestNames(search: string): Promise<string[]> {
		const index = await this.nameIndex();
		this.suggestionCursor ??= index.createSearchCursor(10);
		return this.suggestionCursor.getFirstNMatches(search);
	}

	/** Resolves cards named in an import to the printings a deck edit adds. */
	async importEdits(cards: ImportedCard[]): Promise<CardEdit[]> {
		const edits: CardEdit[] = [];
		for (const card of cards) {
			const resolved = await this.resolve(card.name, card.setCode);
			edits.push(cardEdit(resolved.uuid, 'add', card.count, card.board));
		}
		return edits;
	}
}
