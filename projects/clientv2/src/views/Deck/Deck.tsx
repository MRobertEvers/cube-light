import React from 'react';
import { useCallback, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Page } from '../../components/Page/Page';
import { Decklist } from './components/Decklist/Decklist';
import { fetchSortedDeck } from '../../workers/deck.functions';
import { EditCardModal } from './components/EditCard';
import { Modal } from './components/Modal';
import { GetDeckResponse } from '../../workers/deck.worker.messages';
import { FetchAPIDeckCardResponse } from '../../api/fetch-api-deck';
import { fetchAPISetCard } from '../../api/fetch-api-set-card';
import { Button } from '../../components/Button/Button';
import { LoadingIndicator } from '../../components/LoadingIndicator';
import { DeckStatsSummary } from './components/DeckStatsSummary/DeckStatsSummary';
import { toFriendlyDate } from '../../utils/to-friendly-date';
import { useQueryState } from 'src/hooks/useQueryState';
import { reducer, initialState, Actions, DeckState } from './deck-state';
import { AddCard } from './components/AddCard';
import { useAsyncReducer } from 'src/hooks/useAsyncReducer';

import styles from './deck.module.css';
import { AddCardEventType } from './components/AddCard/AddCard';
import { fetchAPIDeleteDeck } from 'src/api/fetch-api-delete-deck';
import { useHistory } from 'react-router-dom';

export type DeckControlButtonsProps = {
	state: DeckState;
	dispatch: any;
	deckId: string;

	// TODO: Better way to sync state and url?
	isEditMode: boolean;
	setIsEditMode: any;
};

export function DeckControlButtons(props: DeckControlButtonsProps) {
	const { state, dispatch, isEditMode, setIsEditMode, deckId } = props;

	const router = useHistory();

	return (
		<>
			{!isEditMode ? (
				<Button
					className={styles['edit-deck-button']}
					onClick={() => setIsEditMode(!isEditMode)}
				>
					Edit deck
				</Button>
			) : (
				<>
					<Button
						className={styles['edit-deck-button']}
						onClick={() => dispatch(Actions.setViewAddCard(true))}
					>
						Add card
					</Button>
					<Button
						className={styles['edit-deck-button']}
						onClick={() => setIsEditMode(!isEditMode)}
					>
						Ok
					</Button>
					<Button
						className={styles['delete-deck-button']}
						onClick={async () => {
							await fetchAPIDeleteDeck(deckId);
							router.push('/');
						}}
					>
						Delete
					</Button>
				</>
			)}
		</>
	);
}
export type DeckProps = {
	initialDeckData?: GetDeckResponse;
	deckId: string;
};

export function Deck(props: DeckProps) {
	const { initialDeckData, deckId } = props;
	const [state, dispatch] = useAsyncReducer(reducer, initialState);
	const { viewEditCard, viewAddCard } = state;

	const [isEditMode, setIsEditMode] = useQueryState('edit', {
		parse: (value: string) => value === 'true',
		serialize: (value: boolean) => value.toString()
	});

	const { data, error } = useSWR(
		deckId,
		async (key: string) => {
			return await fetchSortedDeck(key);
		},
		{ initialData: initialDeckData }
	);

	const onSubmitChange = useCallback(async (card: FetchAPIDeckCardResponse) => {
		await fetchAPISetCard(deckId, card.name, 'set', card.count);
		dispatch(Actions.setEditCard(null));
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
			{viewEditCard ? (
				<Modal>
					<EditCardModal
						onSubmit={onSubmitChange}
						onCancel={() => dispatch(Actions.setEditCard(null))}
						card={viewEditCard}
					/>
				</Modal>
			) : viewAddCard ? (
				<Modal>
					<AddCard
						deckId={deckId}
						onEvent={(e) => {
							switch (e.type) {
								case AddCardEventType.CLOSE:
									dispatch(Actions.setViewAddCard(false));
									break;
								case AddCardEventType.SUBMIT:
									dispatch(Actions.setViewAddCard(false));
									break;
							}
						}}
					/>
				</Modal>
			) : undefined}
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
						</div>
					</div>
					<DeckControlButtons
						deckId={deckId}
						state={state}
						dispatch={dispatch}
						isEditMode={!!isEditMode}
						setIsEditMode={setIsEditMode}
					/>
					<DeckStatsSummary deck={data} />
				</div>
				<Decklist
					name={data.name}
					deck={data.deck}
					onCardClick={(card: FetchAPIDeckCardResponse) => {
						if (isEditMode) {
							dispatch(Actions.setEditCard(card));
						}
					}}
				/>
			</div>
		</Page>
	);
}
