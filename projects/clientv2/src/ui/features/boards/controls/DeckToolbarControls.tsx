import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DeckImageScanCard } from '../../../kit/components/ImageCardImport/DeckImageScanCard';
import { toFriendlyDate } from '../../../kit/utils/to-friendly-date';
import { DeckControlIcon } from '../../../kit/components/DeckControlIcons/DeckControlIcons';
import { DeckViewSwitch } from '../../deck-chrome/DeckViewSwitch';
import type { BoardControlsProps } from '../board.types';

import deckStyles from '../../../pages/Deck/deck.module.css';
import styles from './deck-toolbar-controls.module.css';

/** One compact row above a board that wants the page's whole width. */
export function DeckToolbarControls(props: BoardControlsProps) {
	const {
		deck,
		deckId,
		view,
		topStyle,
		previewIcon,
		isSaving,
		errors,
		onBannerElement,
		onAddCard,
		onAddCards,
		onImportImage,
		onEditName,
		onDeleteDeck
	} = props;
	const navigate = useNavigate();
	const sideCount = deck.boards.side.count;
	return (
		<div className={styles.controls}>
			<div className={styles.toolbar}>
				<div
					ref={topStyle === 'card' ? onBannerElement : undefined}
					className={styles.identity}
				>
					{topStyle === 'card' && previewIcon && (
						<img className={styles.thumb} src={previewIcon} alt="" />
					)}
					<div className={styles.title}>
						<h1>{deck.name}</h1>
						<p>
							{deck.deck.count}{' '}
							{deck.deck.count === 1 ? 'card' : 'cards'}
							{sideCount > 0 && ` · ${sideCount} in sideboard`}
							{` · Updated ${toFriendlyDate(deck.lastEdit)}`}
						</p>
					</div>
				</div>
				<div className={styles.tabs}>
					<DeckViewSwitch deckId={deckId} view={view} />
				</div>
				<div
					className={styles.group}
					role="group"
					aria-label="Add cards"
				>
					<button type="button" onClick={onAddCard} disabled={isSaving}>
						<DeckControlIcon name="search" /> Search
					</button>
					<button type="button" onClick={onAddCards} disabled={isSaving}>
						<DeckControlIcon name="list" /> Paste list
					</button>
					<button
						type="button"
						onClick={onImportImage}
						disabled={isSaving}
					>
						<DeckControlIcon name="camera" /> Scan image
					</button>
				</div>
				<div className={styles.group} role="group" aria-label="Deck">
					<button type="button" onClick={onEditName} disabled={isSaving}>
						Name and tags
					</button>
					<button
						type="button"
						onClick={() => navigate(`/deck/${deckId}/history`)}
					>
						History
					</button>
					<button
						type="button"
						onClick={() => navigate(`/deck/${deckId}/settings`)}
					>
						Appearance
					</button>
					<button
						type="button"
						className={styles.delete}
						onClick={onDeleteDeck}
						disabled={isSaving}
					>
						Delete
					</button>
				</div>
			</div>
			<DeckImageScanCard deckId={deckId} />
			{errors.map((error) => (
				<p key={error} className={deckStyles['save-error']} role="alert">
					{error}
				</p>
			))}
		</div>
	);
}
