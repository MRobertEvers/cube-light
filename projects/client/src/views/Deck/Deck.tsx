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

export type DeckProps = {
	initialDeckData?: GetDeckResponse;
	deckId: string;
};

export function Deck(props: DeckProps) {
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
		await mutate(deckId);
	}, []);

	return (
		<Page>
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
}
