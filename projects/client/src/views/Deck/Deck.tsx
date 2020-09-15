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
import { fetchSetCard } from '../../api/fetch-set-card';
import { Modal } from './components/Modal';

import styles from './deck.module.css';

export type WorkoutProps = {
	initialDeckData: GetDeckResponse;
	deckId: string;
};

const Index: NextPage<WorkoutProps> = (props: WorkoutProps) => {
	const { initialDeckData, deckId } = props;

	const [editMode, setEditMode] = useQueryState('edit', {
		history: 'push',
		shallow: true,
		parse: (value: string) => value === 'true',
		serialize: (value: boolean) => value.toString()
	});

	const { data, error } = useSWR(
		deckId,
		async (key: string) => {
			return await fetchSortedDeck({ deckId: key, type: 'deck' });
		},
		{ initialData: initialDeckData }
	);

	const [editCard, setEditCard] = useState(null as FetchDeckCardResponse | null);
	const onCardClick = useCallback((card: FetchDeckCardResponse) => {
		setEditCard(card);
	}, []);

	const onSubmitChange = useCallback(async (card: FetchDeckCardResponse) => {
		await fetchSetCard(deckId, card.name, 'set', card.count);
		setEditCard(null);
		mutate(deckId);
	}, []);

	return (
		<Page title={'Home'}>
			{editCard && (
				<Modal>
					<EditCardModal onSubmit={onSubmitChange} onCancel={() => setEditCard(null)} card={editCard} />
				</Modal>
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

export async function getServerSideProps(context) {
	const deckId = context.params.id || '1';
	const data = await fetchSortedDeck({ deckId: deckId, type: 'deck' });

	return { props: { initialDeckData: data, deckId: deckId } };
}

export default Index;
