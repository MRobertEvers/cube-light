import React from 'react';
import { useCallback, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Page } from '../../components/Page/Page';
import { Decklist } from '../../components/Decklist/Decklist';
import { CardAdder } from './components/CardAdder';
import { fetchSortedDeck } from '../../workers/deck.functions';
import { EditCardModal } from '../../components/EditCard';
import { Modal } from './components/Modal';
import { GetDeckResponse } from '../../workers/deck.worker.messages';
import { FetchDeckCardResponse } from '../../api/fetch-api-deck';
import { fetchAPISetCard } from '../../api/fetch-api-set-card';

import styles from './deck.module.css';
import { Button } from '../../components/Button/Button';
import { LoadingIndicator } from '../../components/LoadingIndicator';
import { DeckStatsSummary } from './components/DeckStatsSummary/DeckStatsSummary';
import { toFriendlyDate } from '../../utils/to-friendly-date';

export type DeckProps = {
	initialDeckData?: GetDeckResponse;
	deckId: string;
};

export function Deck(props: DeckProps) {
	const { initialDeckData, deckId } = props;
	const editMode = false;
	// const [editMode, setEditMode] = useQueryState('edit', {
	// 	history: 'push',
	// 	shallow: true,
	// 	parse: (value: string) => value === 'true',
	// 	serialize: (value: boolean) => value.toString()
	// });

	const { data, error } = useSWR(
		deckId,
		async (key: string) => {
			return await fetchSortedDeck(key);
		},
		{ initialData: initialDeckData }
	);

	const [editCard, setEditCard] = useState(null as FetchDeckCardResponse | null);
	const onCardClick = useCallback((card: FetchDeckCardResponse) => {
		setEditCard(card);
	}, []);

	const onSubmitChange = useCallback(async (card: FetchDeckCardResponse) => {
		await fetchAPISetCard(deckId, card.name, 'set', card.count);
		setEditCard(null);
		await mutate(deckId);
	}, []);

	if (!data) {
		return (
			<Page>
				<LoadingIndicator />
			</Page>
		);
	}

	return (
		<Page>
			{editCard && (
				<Modal>
					<EditCardModal
						onSubmit={onSubmitChange}
						onCancel={() => setEditCard(null)}
						card={editCard}
					/>
				</Modal>
			)}
			<div className={styles['index-container-top']}></div>
			<div className={styles['index-container']}>
				<div className={styles['banner-container']}>
					<div className={styles['banner']}>
						<div className={styles['avatar']}>
							<div className={styles['square']}>
								{data && <img width={260} height={260} src={data.icon} />}
							</div>
						</div>
						<div className={styles['banner-info']}>
							<h2 className={styles['banner-title']}>{data.name}</h2>
							<span className={styles['banner-sub-title']}>
								Updated{' '}
								<span className={styles['banner-sub-title-emphasis']}>
									{toFriendlyDate(data.lastEdit.toString())}
								</span>
							</span>
							<Button style={{ width: '100%', margin: '16px 0' }}>Edit deck</Button>
						</div>
					</div>
					<DeckStatsSummary deck={data} />
				</div>
				{data && <Decklist name={data.name} deck={data.deck} onCardClick={onCardClick} />}
			</div>
		</Page>
	);
}
