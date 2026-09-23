import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../kit/components/Button/Button';
import { DeckControlIcon } from '../../kit/components/DeckControlIcons/DeckControlIcons';
import { DeckViewSwitch, type DeckView } from './DeckViewSwitch';

import styles from './mobile-deck-controls.module.css';

export type MobileDeckControlsProps = {
	deckId: string;
	view: DeckView;
	isSaving: boolean;
	onAddCard: () => void;
	onAddCards: () => void;
	onImportImage: () => void;
	onEditName: () => void;
	onDeleteDeck: () => void;
};

/** The deck page's view tabs, add-card tiles and deck actions, sized for touch. */
export function MobileDeckControls(props: MobileDeckControlsProps) {
	const {
		deckId,
		view,
		isSaving,
		onAddCard,
		onAddCards,
		onImportImage,
		onEditName,
		onDeleteDeck
	} = props;
	const navigate = useNavigate();

	return (
		<div className={styles.controls}>
			<DeckViewSwitch deckId={deckId} view={view} />
			<section
				className={styles.group}
				aria-labelledby="mobile-add-cards"
			>
				<h2 id="mobile-add-cards">Add cards</h2>
				<div className={styles.addTiles}>
					<Button onClick={onAddCard} disabled={isSaving}>
						<DeckControlIcon name="search" />
						<span>Search</span>
					</Button>
					<Button onClick={onAddCards} disabled={isSaving}>
						<DeckControlIcon name="list" />
						<span>Paste list</span>
					</Button>
					<Button onClick={onImportImage} disabled={isSaving}>
						<DeckControlIcon name="camera" />
						<span>Scan image</span>
					</Button>
				</div>
			</section>
			<section
				className={styles.group}
				aria-labelledby="mobile-deck-actions"
			>
				<h2 id="mobile-deck-actions">Deck</h2>
				<div className={styles.deckActions}>
					<Button onClick={onEditName} disabled={isSaving}>
						Rename
					</Button>
					<Button onClick={() => navigate(`/deck/${deckId}/history`)}>
						History
					</Button>
					<Button
						onClick={() => navigate(`/deck/${deckId}/settings`)}
					>
						Appearance
					</Button>
					<Button
						className={styles.deleteDeck}
						disabled={isSaving}
						onClick={onDeleteDeck}
					>
						Delete
					</Button>
				</div>
			</section>
		</div>
	);
}
