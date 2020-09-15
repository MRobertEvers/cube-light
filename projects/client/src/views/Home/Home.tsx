import { NextPage } from 'next';
import useSWR, { mutate } from 'swr';
import { useCallback, useState } from 'react';
import { Page } from '../../components/Page/Page';
import { Decklist } from '../../components/Decklist/Decklist';
import { CardAdder } from './components/CardAdder';
import { fetchSortedDeck } from '../../workers/deck.functions';
import { useQueryState } from '../../hooks/useQueryParam';
import type { GetDeckResponse } from '../../workers/deck.types';
import { FetchDeckCardResponse } from '../../api/fetch-deck';
import { EditCardModal } from '../../components/EditCard';

import styles from './home.module.css';
import { fetchSetCard } from '../../api/fetch-set-card';

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

	const [editCard, setEditCard] = useState(null as FetchDeckCardResponse | null);
	const onCardClick = useCallback((card: FetchDeckCardResponse) => {
		setEditCard(card);
	}, []);

	return (
		<Page title={'Home'}>
			{editCard && (
				<div className={styles['modal-container']}>
					<div className={styles['modal-container-contents']}>
						<EditCardModal
							onSubmit={(card) => {
								async function send() {
									await fetchSetCard('1', card.name, 'set', card.count);
									setEditCard(null);
									mutate('1');
								}
								send();
							}}
							onCancel={() => setEditCard(null)}
							card={editCard}
						/>
					</div>
				</div>
			)}
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
				{data && <Decklist name={data.name} deck={data.deck} onCardClick={onCardClick} />}
			</div>
		</Page>
	);
};

export async function getServerSideProps() {
	const data = await fetchSortedDeck({ deckId: '1', type: 'deck' });

	return { props: { initialDeckData: data } };
}

export default Index;
