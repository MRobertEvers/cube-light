import { NextPage as NextPageType, GetStaticPropsContext } from 'next';
import { NextPage } from '../../components/Page/NextPage';
import { fetchSortedDeck } from '../../api/composite/deck.functions';
import { Deck } from './Deck';
import { GetDeckResponse } from '../../workers/deck.worker.messages';
import { fetchAPIDecks, FetchDecksResponse } from '../../../api/fetch-api-decks';

export type DeckPageProps = {
	initialDeckData: GetDeckResponse;
	deckId: string;
};

const DeckPage: NextPageType<DeckPageProps> = (props: DeckPageProps) => {
	const { initialDeckData, deckId } = props;
	return (
		<NextPage title={'Home'}>
			<Deck initialDeckData={initialDeckData} deckId={deckId} />
		</NextPage>
	);
};

export async function getStaticPaths() {
	const decks: FetchDecksResponse = [];
	const pageSize = 100;
	for (let start = 0; ; start += pageSize) {
		const page = await fetchAPIDecks(start, pageSize);
		decks.push(...page);
		if (page.length < pageSize) break;
	}
	return {
		paths: decks.map((deck) => ({ params: { id: deck.deckId } })),
		fallback: false
	};
}

export async function getStaticProps(context: GetStaticPropsContext) {
	const deckId = context.params?.id as string;
	const data = await fetchSortedDeck(deckId);

	return { props: { initialDeckData: data, deckId: deckId } };
}

export default DeckPage;
