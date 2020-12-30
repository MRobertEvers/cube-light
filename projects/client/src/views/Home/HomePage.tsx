import { NextPage as NextPageType } from 'next';
import { NextPage } from '../../components/Page/NextPage';
import { fetchDecks, FetchDecksResponse } from '../../api/fetch-decks';
import { Home } from './Home';

export type HomePageProps = {
	initialData: FetchDecksResponse;
	deckId: string;
};

const HomePage: NextPageType<HomePageProps> = (props: HomePageProps) => {
	const { initialData } = props;

	return (
		<NextPage title={'Home'}>
			<Home initialData={initialData} />
		</NextPage>
	);
};

export async function getStaticProps() {
	const data = await fetchDecks();

	return { props: { initialDeckData: data } };
}

export default HomePage;
