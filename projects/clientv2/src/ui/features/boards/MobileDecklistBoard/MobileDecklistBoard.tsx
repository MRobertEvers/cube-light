import React, { useMemo, useState } from 'react';
import type {
	DeckBoard,
	DeckCardEntry
} from '../../../../domain/models/deck';
import type { BoardAnnotations, BoardCardKey, BoardProps, BoardSection } from '../board.types';
import type { DecklistSpotlightProps } from '../decklist-spotlight';
import { ManaCost } from '../../../kit/components/ManaCost/ManaCost';
import { BoardChips, OwnershipBadge, OwnershipPips } from '../../../kit/components/OwnershipBadge/OwnershipBadge';
import { ownedNameKey } from '../../../../domain/library/ownership';
import { OverflowMenu } from '../../../kit/components/OverflowMenu/OverflowMenu';
import {
	DeckCardGroup,
	compareDeckCardGroupsByManaCost,
	groupDeckCardsByName
} from '../../../../domain/deck/group-deck-cards';
import {
	DECK_BOARD_LABELS,
	DECK_BOARD_ORDER,
	moveToBoardLabel
} from '../../../../domain/deck/boards';
import type { BoardGroups } from '../../../../domain/deck/grouping';
import { SpotlightCard } from '../../SpotlightCard/SpotlightCard';

import styles from './mobile-decklist-board.module.css';

/** Each deck board is listed separately, in DECK_BOARD_ORDER. */
export type MobileDecklistBoardProps = BoardProps & DecklistSpotlightProps;

type MobileCardActions = {
	busyGroup: BoardCardKey | null;
	annotations?: BoardAnnotations;
	/** The move action's menu text; moving to the other deck board by default. */
	moveLabel?: string;
	deleteLabel?: string;
	onEdit: (group: DeckCardGroup) => void;
	onView: (card: DeckCardEntry, group: DeckCardGroup) => void;
	onDelete: (group: DeckCardGroup) => void;
	/** Moves every copy of the card to the other board. */
	onMove: (group: DeckCardGroup) => void;
};

type MobileCardRowProps = MobileCardActions & {
	group: DeckCardGroup;
};

const MOBILE_DECK_SECTIONS: readonly BoardSection[] = DECK_BOARD_ORDER.map((board) => ({ board, label: DECK_BOARD_LABELS[board] }));

function thumbnailOf(card: DeckCardEntry) {
	return card.images?.small ?? card.image;
}

function MobileCardRow(props: MobileCardRowProps) {
	const { group, busyGroup, annotations, moveLabel, deleteLabel, onEdit, onView, onDelete, onMove } = props;
	const [top] = group.printings;
	const owned = annotations?.ownership?.[ownedNameKey(group.name)];
	const [expanded, setExpanded] = useState(false);
	const deleting =
		busyGroup?.board === group.board && busyGroup.name === group.name;
	const printingsId = `mobile-printings-${group.board}-${group.name.replace(/\W+/g, '-')}`;

	return (
		<li className={expanded ? styles.expanded : undefined}>
			<div className={styles.row}>
				<button
					type="button"
					className={styles.rowMain}
					aria-expanded={
						group.printings.length > 1 ? expanded : undefined
					}
					aria-controls={
						expanded && group.printings.length > 1
							? printingsId
							: undefined
					}
					onClick={() => {
						if (group.printings.length > 1) setExpanded(!expanded);
						else onView(top, group);
					}}
					disabled={deleting}
				>
					<span className={styles.count}>{group.count}</span>
					<span className={styles.name}>{group.name}</span>
					<ManaCost cost={top.manaCost} />
					{owned && <OwnershipPips row={owned} />}
					{owned && owned.status !== 'owned' && <OwnershipBadge row={owned} compact />}
					{group.printings.length === 1 ? (
						<span className={styles.setCode}>({top.setCode})</span>
					) : (
						<>
							<span
								className={styles.thumbnails}
								aria-hidden="true"
							>
								{group.printings.slice(0, 3).map((card) => (
									<img
										key={card.uuid}
										src={thumbnailOf(card)}
										alt=""
										loading="lazy"
									/>
								))}
							</span>
							<span className={styles.printCount}>
								{group.printings.length}
							</span>
							<svg
								className={styles.caret}
								viewBox="0 0 16 16"
								width="16"
								height="16"
								aria-hidden="true"
							>
								<path d="M4 6l4 4 4-4" />
							</svg>
						</>
					)}
				</button>
				<OverflowMenu
					label={`Actions for ${group.name}`}
					disabled={deleting}
				>
					<button type="button" onClick={() => onEdit(group)}>
						Edit
					</button>
					<button type="button" onClick={() => onView(top, group)}>
						View
					</button>
					<button type="button" onClick={() => onMove(group)}>
						{moveLabel ?? moveToBoardLabel(group.board)}
					</button>
					<button
						type="button"
						className={styles.delete}
						onClick={() => onDelete(group)}
					>
						{deleteLabel ?? 'Delete'}
					</button>
				</OverflowMenu>
			</div>
			{group.printings.length === 1 && annotations?.printingChips?.[top.uuid] && (
				<div className={styles.chipLine}>
					<BoardChips chips={annotations.printingChips[top.uuid]} />
				</div>
			)}
			{expanded && group.printings.length > 1 && (
				<ul
					id={printingsId}
					className={styles.printings}
					aria-label={`${group.name} printings`}
				>
					{group.printings.map((card) => (
						<li key={card.uuid}>
							<button type="button" onClick={() => onView(card, group)}>
								<img
									src={thumbnailOf(card)}
									alt=""
									loading="lazy"
								/>
								<span>{card.setCode}</span>
								<BoardChips chips={annotations?.printingChips?.[card.uuid]} />
								<ManaCost cost={card.manaCost} />
								<strong>×{card.count}</strong>
							</button>
						</li>
					))}
				</ul>
			)}
		</li>
	);
}

type MobileDecklistSectionProps = MobileCardActions & {
	board: DeckBoard;
	label: string;
	empty?: string;
	deck: BoardGroups;
};

/** One board of a deck: its heading and card-type sections, lands last. */
function MobileDecklistSection(props: MobileDecklistSectionProps) {
	const { board, label, empty, deck, busyGroup, annotations, moveLabel, deleteLabel, onEdit, onView, onDelete, onMove } = props;
	const headingId = `mobile-decklist-board-${board}`;
	const categories = useMemo(
		() =>
			Object.keys(deck.cardCategories)
				.toSorted(
					(a, b) => Number(/Land/.test(a)) - Number(/Land/.test(b))
				)
				.map((name) => ({
					name,
					category: deck.cardCategories[name],
					cards: groupDeckCardsByName(
						deck.cardCategories[name].cards
					).sort(compareDeckCardGroupsByManaCost)
				})),
		[deck]
	);

	return (
		<section
			className={styles.board}
			aria-labelledby={headingId}
			data-board={board}
		>
			<h2 id={headingId} className={styles.boardHeader}>
				{label}
				<span className={styles.boardCount}>{deck.count}</span>
			</h2>
			{deck.count === 0 && (
				<p className={styles.boardEmpty}>
					{empty ?? (board === 'side'
						? 'No sideboard cards yet. Use a card’s actions menu to move it here, or paste a list with a Sideboard section.'
						: 'No cards in the main board yet.')}
				</p>
			)}
			{categories.map((item) => (
				<section key={item.name} className={styles.category}>
					<h3>{`${item.name} (${item.category.count})`}</h3>
					<ul className={styles.rows}>
						{item.cards.map((group) => (
							<MobileCardRow
								key={group.name}
								group={group}
								busyGroup={busyGroup}
								annotations={annotations}
								moveLabel={moveLabel}
								deleteLabel={deleteLabel}
								onEdit={onEdit}
								onView={onView}
								onDelete={onDelete}
								onMove={onMove}
							/>
						))}
					</ul>
				</section>
			))}
		</section>
	);
}

/** The phone deck view: touch rows by card type, each with an actions menu. */
export function MobileDecklistBoard(props: MobileDecklistBoardProps) {
	const {
		cards,
		busyGroup,
		onCardEvent,
		banner,
		bannerCrop,
		bannerBlend,
		topStyle,
		annotations,
		moveLabel,
		deleteLabel,
		sections = MOBILE_DECK_SECTIONS
	} = props;
	const rowProps: MobileCardActions = {
		busyGroup,
		annotations,
		moveLabel,
		deleteLabel,
		onEdit: (group) => onCardEvent({ type: 'edit', group }),
		onView: (card, group) => onCardEvent({ type: 'view', card, group }),
		onDelete: (group) => onCardEvent({ type: 'delete', group }),
		onMove: (group) => onCardEvent({ type: 'move', group })
	};

	return (
		<div className={styles.body}>
			{banner && topStyle === 'card' && (
				<div className={styles.spotlight}>
					<SpotlightCard
						art={banner.art}
						artInfo={banner.artInfo}
						name={banner.name}
						crop={bannerCrop}
						bannerBlend={bannerBlend}
						variant="mobile"
					/>
				</div>
			)}
			{sections.map((section) => (
				<MobileDecklistSection
					key={section.board}
					board={section.board}
					label={section.label}
					empty={section.empty}
					deck={cards[section.board]}
					busyGroup={rowProps.busyGroup}
					annotations={rowProps.annotations}
					moveLabel={rowProps.moveLabel}
					deleteLabel={rowProps.deleteLabel}
					onEdit={rowProps.onEdit}
					onView={rowProps.onView}
					onDelete={rowProps.onDelete}
					onMove={rowProps.onMove}
				/>
			))}
		</div>
	);
}
