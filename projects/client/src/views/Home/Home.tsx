import Link from 'next/link';
import { fetchDecks, FetchDecksResponse } from '../../api/fetch-decks';
import { Page } from '../../components/Page/Page';
import { useEffect, useState } from 'react';


export type HomeProps = {
	initialData?: FetchDecksResponse;
};

export function Home(props: HomeProps) {
	const { initialData } = props;

	const [data, setData] = useState<FetchDecksResponse>([])
	useEffect(() => {
		async function fetchData() {
			const response = await fetchDecks(0, 0);
			setData(response);
		}
		fetchData()
	}, [])

	return (
		<Page>
			<ul>
				{data?.map((deck) => {
					return (
						<li>
							<Link href="/decks/[id]" as={`/decks/${deck.deckId}`}>
								{deck.name}
							</Link>
						</li>
					);
				})}
			</ul>
		</Page>
	);
}
