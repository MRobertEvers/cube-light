import { NextPage } from 'next';
import Link from 'next/link';
import useSWR from 'swr';
import { Page } from '../../components/Page/Page';
import { fetchDecks, FetchDecksResponse } from '../../api/fetch-decks';

import styles from './home.module.css';

export type HomeProps = {
	initialData?: FetchDecksResponse;
};

export function Home(props: HomeProps) {
	const { initialData } = props;

	const { data, error } = useSWR(
		'decks',
		async (key: string) => {
			return await fetchDecks();
		},
		{ initialData: initialData }
	);

	return (
		<Page>
			<ul>
				{data?.map((deck) => {
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
}
