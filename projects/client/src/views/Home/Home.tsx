import { NextPage } from 'next';
import useSWR from 'swr';
import { Page } from '../../components/Page/Page';
import { Decklist } from '../../components/Decklist/Decklist';
import { CardAdder } from './components/CardAdder';
import { fetchDeck, FetchDeckResponse } from '../../api/fetch-deck';

import styles from './home.module.css';
import { fetchSortedDeck } from '../../workers/deck.functions';
import { useDeckWorker } from '../../workers/deck.hook';

export type WorkoutProps = {
	initialDeckData: FetchDeckResponse;
};

const Index: NextPage<WorkoutProps> = (props: WorkoutProps) => {
	const { initialDeckData } = props;

	const { data, error } = useSWR('1', fetchDeck, { initialData: initialDeckData });

	return (
		<Page>
			<div className={styles['index-container-top']}>
				<CardAdder></CardAdder>
			</div>
			<div className={styles['index-container']}>
				<div>
					<div className={styles['avatar']}>{data && <img src={data.icon} />}</div>
				</div>
				{data && <Decklist name={data.name} cards={data.cards} />}
			</div>
		</Page>
	);
};

export async function getServerSideProps() {
	const data = await fetchSortedDeck({ deckId: '1', type: 'deck' });
	return { props: { initialDeckData: data } };
}

export default Index;
