import React, { useEffect, useState } from 'react';
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

import styles from './home.module.css';

export type HomeProps = {
	initialData?: FetchDecksResponse;
};

export function Home(props: HomeProps) {
	const { initialData } = props;
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const [isShowModal, setIsShowModal] = useState(false);
	const [showImageImport, setShowImageImport] = useState(false);
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
						onClick={() => setIsShowModal(true)}
					>
						New Deck
					</Button>
					<Button
						className={styles['header-button']}
						onClick={() => setShowImageImport(true)}
					>
						Create a deck from image
					</Button>
				</div>
			}
		>
			{showImageImport && (
				<ImageCardImport
					mode="create"
					onClose={() => setShowImageImport(false)}
					onComplete={(deckId, taskId) => {
						setShowImageImport(false);
						navigate(
							taskId
								? `/deck/${deckId}/scan/${taskId}`
								: `/deck/${deckId}`
						);
					}}
				/>
			)}
			{isShowModal && (
				<Modal>
					<NewDeckModal
						onEvent={async (e: NewDeckModalEvent) => {
							if (e.type === NewDeckModalEventType.CLOSE) {
								setIsShowModal(false);
							} else {
								const deckData = await fetchAPICreateDeck(
									e.payload
								);

								navigate(`/deck/${deckData.deckId}`);
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
