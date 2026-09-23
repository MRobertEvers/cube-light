import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { OverflowMenu } from 'src/ui/kit/components/OverflowMenu/OverflowMenu';
import { SpotlightCard } from 'src/ui/features/SpotlightCard/SpotlightCard';
import { DeckSummaries } from '../../../domain/models/deck';
import {
	createDeck,
	loadDecks,
	selectDecks,
	selectDecksError,
	setInitialDecks
} from '../../../state/decks/decks.state';
import { useAppDispatch } from '../../../state/use-app-dispatch';
import { Page } from '../../kit/components/Page/Page';
import { Modal } from '../Deck/components/Modal';
import {
	NewDeckModal,
	NewDeckModalEvent,
	NewDeckModalEventType
} from './components/NewDeck';
import { ImageCardImport } from 'src/ui/kit/components/ImageCardImport/ImageCardImport';
import { useHistoryModal } from 'src/ui/kit/hooks/useHistoryModal';

import styles from './home.module.css';

export type HomeProps = {
	initialData?: DeckSummaries;
};

function NewDeckIcon() {
	return (
		<>
			<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
				<path
					d="M12 5v14M5 12h14"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.8"
					strokeLinecap="round"
				/>
			</svg>
			<svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
				<path d="M1 3h8L5 7.5z" fill="currentColor" />
			</svg>
		</>
	);
}

type HomeModal = { type: 'new-deck' } | { type: 'image-import' };

export function Home(props: HomeProps) {
	const { initialData } = props;
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const modalHistory = useHistoryModal<HomeModal>('home');
	const modal = modalHistory.value;
	const data = useSelector(selectDecks);
	const error = useSelector(selectDecksError);

	useEffect(() => {
		if (initialData) dispatch(setInitialDecks(initialData));
		void dispatch(loadDecks());
	}, [dispatch, initialData]);

	return (
		<Page
			header={
				<OverflowMenu
					label="Create a deck"
					icon={<NewDeckIcon />}
					triggerClassName={styles['new-deck-trigger']}
				>
					<button
						type="button"
						onClick={() => modalHistory.open({ type: 'new-deck' })}
					>
						New deck
					</button>
					<button
						type="button"
						onClick={() =>
							modalHistory.open({ type: 'image-import' })
						}
					>
						New deck from image
					</button>
				</OverflowMenu>
			}
		>
			{modal?.type === 'image-import' && (
				<ImageCardImport
					mode="create"
					onClose={modalHistory.close}
					onComplete={(deckId, taskId) => {
						navigate(
							taskId
								? `/deck/${deckId}/scan/${taskId}`
								: `/deck/${deckId}`,
							{ replace: true }
						);
					}}
				/>
			)}
			{modal?.type === 'new-deck' && (
				<Modal>
					<NewDeckModal
						onEvent={async (e: NewDeckModalEvent) => {
							if (e.type === NewDeckModalEventType.CLOSE) {
								modalHistory.close();
							} else {
								const deckId = await dispatch(createDeck(e.payload));

								navigate(`/deck/${deckId}`, {
									replace: true
								});
							}
						}}
					/>
				</Modal>
			)}
			<main className={styles['home-container']}>
				<div className={styles['heading']}>
					<div>
						<h1>Your decks</h1>
						<p>Pick a deck to view its cards and make changes.</p>
					</div>
				</div>
				{error && <p role="alert">Unable to refresh decks.</p>}
				<div className={styles['deck-grid']}>
					{data?.map((deck) => (
						<Link
							className={styles['deck-link']}
							key={deck.deckId}
							to={`/deck/${deck.deckId}`}
						>
							<SpotlightCard
								name={deck.name}
								art={deck.art}
								bannerBlend={deck.bannerBlend}
								tile
								createdAt={deck.createdAt}
								updatedAt={deck.updatedAt}
							/>
						</Link>
					))}
				</div>
			</main>
		</Page>
	);
}
