import { useEffect, useMemo, useState } from 'react';
import { loadLibrary } from 'src/redux/library/library.thunks';
import { selectOwnership } from 'src/redux/library/library.selectors';
import { selectDecks } from 'src/redux/decks/decks.selectors';
import { useAppDispatch } from 'src/redux/use-app-dispatch';
import { useAppSelector } from 'src/redux/use-app-selector';
import {
	ownedPrintingFor,
	ownsAnything,
	suggestOwnedNames,
	type OwnedSuggestion
} from 'src/domain/library/ownership';
import { NO_OWNERSHIP } from 'src/domain/models/library';

/** Where the add-card search looks: the owned collections, or every card. */
export type CardSource = 'collection' | 'all';

const SUGGESTION_LIMIT = 10;

export type CardSourceState = {
	source: CardSource;
	setSource: (source: CardSource) => void;
	/** True until the library has been read. */
	loading: boolean;
	/** Whether any collection owns a card; with none, the search starts on every card. */
	ownsCards: boolean;
	/** Owned names matching `query`, best first. */
	suggest: (query: string) => string[];
	/** What the collections hold of a card name, or null when none is owned. */
	describe: (name: string) => OwnedSuggestion | null;
	/** The printing to add: the collection's in collection mode, otherwise the card's default. */
	printingFor: (name: string) => string | undefined;
	/** Other decks' names, by deck ID. */
	deckNames: Record<string, string>;
};

/**
 * The add-card dialogs' search source. It opens on the collection every time, unless
 * nothing is owned yet, so a new library never traps the search in an empty list.
 */
export function useCardSource(deckId: string): CardSourceState {
	const dispatch = useAppDispatch();
	const ownership = useAppSelector(selectOwnership);
	const decks = useAppSelector(selectDecks);
	const [chosen, setChosen] = useState<CardSource | null>(null);
	useEffect(() => {
		void dispatch(loadLibrary());
	}, [dispatch]);
	const owned = ownership ?? NO_OWNERSHIP;
	const ownsCards = ownership === null || ownsAnything(owned);
	const source: CardSource = chosen ?? (ownsCards ? 'collection' : 'all');
	const deckNames = useMemo(() => {
		const names: Record<string, string> = {};
		for (const deck of decks ?? []) names[deck.deckId] = deck.name;
		return names;
	}, [decks]);
	function suggest(query: string): string[] {
		return suggestOwnedNames(owned, deckId, query, SUGGESTION_LIMIT).map((item) => item.name);
	}
	function describe(name: string): OwnedSuggestion | null {
		return suggestOwnedNames(owned, deckId, name, 50).find((item) => item.name.toLowerCase() === name.toLowerCase()) ?? null;
	}
	function printingFor(name: string): string | undefined {
		return source === 'collection' ? (ownedPrintingFor(owned, name) ?? undefined) : undefined;
	}
	return { source, setSource: setChosen, loading: ownership === null, ownsCards, suggest, describe, printingFor, deckNames };
}

/** One line about what the collections hold of a card, e.g. "4 owned · 2 free · 2XM ×3, M11 ×1 · Boros ×2". */
export function ownedSummary(owned: OwnedSuggestion, deckNames: Record<string, string>): string {
	const parts = [`${owned.owned} owned`];
	if (owned.free !== owned.owned) parts.push(`${owned.free} free`);
	const printings = owned.printings.filter((printing) => printing.copies > 0).slice(0, 3).map((printing) => `${printing.setCode || '?'} ×${printing.copies}`);
	if (printings.length) parts.push(printings.join(', '));
	const decks = owned.decks.slice(0, 2).map((deck) => `${deckNames[deck.deckId] ?? 'another deck'} ×${deck.copies}`);
	if (decks.length) parts.push(`in ${decks.join(', ')}`);
	return parts.join(' · ');
}
