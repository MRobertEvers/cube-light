import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { fetchAPICreateDeck } from 'src/api/fetch-api-create-deck';
import { Button } from 'src/components/Button/Button';
import { SpotlightCard } from 'src/widgets/SpotlightCard/SpotlightCard';
import { FetchDecksResponse } from '../../api/fetch-api-decks';
import {
	loadDecks,
	selectDecks,
	selectDecksError,
	setInitialDecks
} from '../../store/decks/decks.state';
import { useAppDispatch } from '../../store/use-app-dispatch';
import { Page } from '../../components/Page/Page';
import { Modal } from '../Deck/components/Modal';
import {
	NewDeckModal,
	NewDeckModalEvent,
	NewDeckModalEventType
} from './components/NewDeck';
import { ImageCardImport } from 'src/components/ImageCardImport/ImageCardImport';
import { useHistoryModal } from 'src/hooks/useHistoryModal';

import styles from './home.module.css';

export type HomeProps = {
	initialData?: FetchDecksResponse;
};

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
				<div className={styles['header-actions']}>
					<Button
						className={styles['header-button']}
						onClick={() => modalHistory.open({ type: 'new-deck' })}
					>
						New Deck
					</Button>
					<Button
						className={styles['header-button']}
						onClick={() =>
							modalHistory.open({ type: 'image-import' })
						}
					>
						Create a deck from image
					</Button>
				</div>
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
								const deckData = await fetchAPICreateDeck(
									e.payload
								);

								navigate(`/deck/${deckData.deckId}`, {
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
