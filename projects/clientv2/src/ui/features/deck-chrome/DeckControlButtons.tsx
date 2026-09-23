import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../kit/components/Button/Button';
import { concatClassNames } from '../../kit/utils/concat-class-names';
import { DeckControlIcon } from '../../kit/components/DeckControlIcons/DeckControlIcons';
import { DeckViewSwitch, type DeckView } from './DeckViewSwitch';

import styles from './deck-chrome.module.css';

export type DeckControlButtonsProps = {
	view: DeckView;
	deckId: string;
	onEditName: () => void;
	onDeleteDeck: () => void;
	onAddCard: () => void;
	onImportImage: () => void;
	onAddCards: () => void;
	isSaving: boolean;
};

/** The deck page's view tabs, add-card tiles and deck actions, stacked for a sidebar. */
export function DeckControlButtons(props: DeckControlButtonsProps) {
	const {
		view,
		onEditName,
		onDeleteDeck,
		onAddCard,
		onImportImage,
		onAddCards,
		isSaving,
		deckId
	} = props;

	const navigate = useNavigate();

	return (
		<div className={styles['deck-controls']}>
			<DeckViewSwitch deckId={deckId} view={view} />
			<div className={styles['deck-edit-panel-body']}>
				<section className={styles['deck-control-group']}>
					<h2 className={styles['deck-control-label']}>Add cards</h2>
					<div className={styles['deck-add-tiles']}>
						<Button
							className={styles['deck-add-tile']}
							onClick={onAddCard}
							disabled={isSaving}
						>
							<DeckControlIcon name="search" />
							<span>Search</span>
							<span className={styles['deck-add-tile-hint']}>
								one card
							</span>
						</Button>
						<Button
							className={styles['deck-add-tile']}
							onClick={onAddCards}
							disabled={isSaving}
						>
							<DeckControlIcon name="list" />
							<span>Paste list</span>
							<span className={styles['deck-add-tile-hint']}>
								many cards
							</span>
						</Button>
						<Button
							className={styles['deck-add-tile']}
							onClick={onImportImage}
							disabled={isSaving}
						>
							<DeckControlIcon name="camera" />
							<span>Scan image</span>
							<span className={styles['deck-add-tile-hint']}>
								from a photo
							</span>
						</Button>
					</div>
				</section>
				<section className={styles['deck-control-group']}>
					<h2 className={styles['deck-control-label']}>Deck</h2>
					<div className={styles['deck-control-row']}>
						<Button
							className={styles['deck-control-button']}
							onClick={onEditName}
							disabled={isSaving}
						>
							Name and tags
						</Button>
						<Button
							className={styles['deck-control-button']}
							onClick={() => navigate(`/deck/${deckId}/history`)}
						>
							History
						</Button>
						<Button
							className={styles['deck-control-button']}
							onClick={() => navigate(`/deck/${deckId}/settings`)}
						>
							Appearance
						</Button>
						<Button
							className={concatClassNames([
								styles['deck-control-button'],
								styles['delete-deck-button']
							])}
							disabled={isSaving}
							onClick={onDeleteDeck}
						>
							Delete
						</Button>
					</div>
				</section>
			</div>
		</div>
	);
}
