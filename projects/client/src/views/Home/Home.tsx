import { NextPage } from 'next';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import { useCallback, useState } from 'react';
import { Page } from '../../components/Page/Page';
import { FetchDeckCardResponse } from '../../api/fetch-deck';
import { fetchSetCard } from '../../api/fetch-set-card';
import { fetchDecks, FetchDecksResponse } from '../../api/fetch-decks';

import styles from './home.module.css';

export type WorkoutProps = {
	initialDeckData: FetchDecksResponse;
	deckId: string;
};

const Index: NextPage<WorkoutProps> = (props: WorkoutProps) => {
	const { initialDeckData, deckId } = props;

	const { data, error } = useSWR(
		'decks',
		async (key: string) => {
			return await fetchDecks();
		},
		{ initialData: initialDeckData }
	);

	return (
		<Page title={'Home'}>
			<ul>
				{data.map((deck) => {
					return (
						<li>
							<Link href="/decks/[id]" as={`/decks/${deck.deckId}`}>
								<a>{deck.name}</a>
							</Link>
						</li>
					);
				})}
			</ul>
		</Page>
	);
};

export async function getStaticProps() {
	const data = await fetchDecks();

	return { props: { initialDeckData: data } };
}

export default Index;
