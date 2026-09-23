import React from 'react';
import { NextPage } from '../../kit/components/Page/NextPage';
import { Deck } from './Deck';
import type { DeckPageProps } from './DeckPage';

export function TabletopPage(props: DeckPageProps) {
	const { deckId } = props;
	return (
		<NextPage title="Tabletop">
			<Deck deckId={deckId} view="tabletop" />
		</NextPage>
	);
}
