import { NextPage } from 'next';
import useSWR from 'swr';
import { Page } from '../../components/Page/Page';
import { Decklist } from '../../components/Decklist/Decklist';
import { CardAdder } from './components/CardAdder';
import { fetchSortedDeck } from '../../workers/deck.functions';
import { useQueryState } from '../../hooks/useQueryParam';
import type { GetDeckResponse } from '../../workers/deck.types';

import styles from './home.module.css';

export type WorkoutProps = {
	initialDeckData: GetDeckResponse;
};

const Index: NextPage<WorkoutProps> = (props: WorkoutProps) => {
	const { initialDeckData } = props;

	const [editMode, setEditMode] = useQueryState('edit', {
		history: 'push',
		shallow: true,
		parse: (value: string) => value === 'true',
		serialize: (value: boolean) => value.toString()
	});

	const { data, error } = useSWR(
		'1',
		async (key: string) => {
			return await fetchSortedDeck({ deckId: key, type: 'deck' });
		},
		{ initialData: initialDeckData }
	);

	return (
		<Page>
			<div className={styles['index-container-top']}>{editMode && <CardAdder />}</div>
			<div className={styles['index-container']}>
				<div>
					<div className={styles['avatar']}>
						<div className={styles['square']}>
							{data && <img width={260} height={260} src={data.icon} />}
						</div>
						<button onClick={() => setEditMode(!editMode)}>Edit</button>
					</div>
				</div>
				{data && <Decklist name={data.name} deck={data.deck} />}
			</div>
		</Page>
	);
};

export async function getServerSideProps() {
	const data = await fetchSortedDeck({ deckId: '1', type: 'deck' });

	return { props: { initialDeckData: data } };
}

export default Index;
