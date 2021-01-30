import React from 'react';
import { NextPage } from '../../components/Page/NextPage';
import { Deck } from './Deck';

export type DeckPageProps = {
	deckId: string;
};

export function DeckPage(props: DeckPageProps) {
	const { deckId } = props;

	return (
		<NextPage title={'Home'}>
			<Deck deckId={deckId} />
		</NextPage>
	);
}
