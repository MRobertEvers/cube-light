import { NextPage as NextPageType, GetStaticPropsContext } from 'next';
import { NextPage } from '../../components/Page/NextPage';
import { fetchSortedDeck } from '../../api/composite/deck.functions';
import { Deck } from './Deck';
import { GetDeckResponse } from '../../workers/deck.worker.messages';

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
	return {
		paths: [{ params: { id: '1' } }],
		fallback: false
	};
}

export async function getStaticProps(context: GetStaticPropsContext) {
	const deckId = (context.params?.id as string) || '1';
	const data = await fetchSortedDeck(deckId);

	return { props: { initialDeckData: data, deckId: deckId } };
}

export default DeckPage;
