import React from 'react';
import { NextPage } from '../../kit/components/Page/NextPage';
import { Deck } from './Deck';
import type { DeckPageProps } from './DeckPage';

export function DeckStatsPage(props: DeckPageProps) {
	const { deckId } = props;
	return (
		<NextPage title="Stats">
			<Deck deckId={deckId} view="stats" />
		</NextPage>
	);
}

export function DeckNotesPage(props: DeckPageProps) {
	const { deckId } = props;
	return (
		<NextPage title="Notes">
			<Deck deckId={deckId} view="notes" />
		</NextPage>
	);
}
