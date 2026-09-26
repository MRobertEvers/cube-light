import React, { useMemo } from 'react';
import { DeckCardEntry } from '../../../../domain/models/deck';
import { ManaCost } from '../../../kit/components/ManaCost/ManaCost';
import { BoardChips, OwnershipBadge } from '../../../kit/components/OwnershipBadge/OwnershipBadge';
import { ownedNameKey } from '../../../../domain/library/ownership';
import type { BoardAnnotations } from '../board.types';
import { TypeGroup } from '../../../../domain/deck/grouping';
import {
	DeckCardGroup,
	compareDeckCardGroupsByManaCost,
	groupDeckCardsByName
} from '../../../../domain/deck/group-deck-cards';

import styles from './decklist-group.module.css';

export enum CardInteractionEventType {
	CLICK = 'CardInteractionEvent/CLICK',
	MANAGE = 'CardInteractionEvent/MANAGE',
	HOVER = 'CardInteractionEvent/HOVER',
	LEAVE = 'CardInteractionEvent/LEAVE'
}

export type CardInteractionEvent =
	| {
			type: CardInteractionEventType.CLICK;
			/** The printing clicked, and every printing of its name. */
			payload: { card: DeckCardEntry; group: DeckCardGroup };
	  }
	| {
			type: CardInteractionEventType.MANAGE;
			payload: DeckCardGroup;
	  }
	| {
			type: CardInteractionEventType.LEAVE;
			payload: DeckCardEntry;
	  }
	| {
			type: CardInteractionEventType.HOVER;
			payload: {
				card: DeckCardEntry;
				position: {
					x: number;
					y: number;
				};
			};
	  };

type OnCardEvent = (event: CardInteractionEvent) => void;

/** Thumbnails shown in a collapsed row; more printings than this are summed in the pill. */
const MAX_ROW_THUMBNAILS = 3;

function thumbnailOf(card: DeckCardEntry) {
	return card.images?.small ?? card.image;
}

/** Hover and focus handlers that preview `card` beside the element. */
function previewHandlers(
	card: DeckCardEntry,
	onCardEvent?: OnCardEvent
) {
	function show(node: HTMLElement) {
		const bounds = node.getBoundingClientRect();
		onCardEvent?.({
			type: CardInteractionEventType.HOVER,
			payload: { card, position: { x: bounds.left, y: bounds.bottom } }
		});
	}
	function hide() {
		return onCardEvent?.({
			type: CardInteractionEventType.LEAVE,
			payload: card
		});
	}
	return {
		onMouseEnter: function (event: React.MouseEvent<HTMLElement>) {
			return show(event.currentTarget);
		},
		onFocus: function (event: React.FocusEvent<HTMLElement>) {
			return show(event.currentTarget);
		},
		onMouseLeave: hide,
		onBlur: hide
	};
}

type CardRowProps = {
	group: DeckCardGroup;
	annotations?: BoardAnnotations;
	expanded: boolean;
	onToggle: (name: string) => void;
	onCardEvent?: OnCardEvent;
};

function CardRow(props: CardRowProps) {
	const { group, annotations, expanded, onToggle, onCardEvent } = props;
	const [top] = group.printings;
	const owned = annotations?.ownership?.[ownedNameKey(group.name)];
	// The chip speaks up only when copies are short.
	const ownership = owned && owned.status !== 'owned' && <OwnershipBadge row={owned} />;
	const topPreview = previewHandlers(top, onCardEvent);
	const printingsId = `printings-${group.board}-${group.name.replace(/\W+/g, '-')}`;

	if (group.printings.length === 1) {
		return (
			<div className={styles['row-with-action']}>
				<button
					type="button"
					className={styles['row']}
					aria-label={`Open ${group.name}, ${top.setCode} printing${top.manaCost ? `, mana cost ${top.manaCost}` : ''}`}
					onClick={() =>
						onCardEvent?.({
							type: CardInteractionEventType.CLICK,
							payload: { card: top, group }
						})
					}
					onMouseEnter={topPreview.onMouseEnter}
					onFocus={topPreview.onFocus}
					onMouseLeave={topPreview.onMouseLeave}
					onBlur={topPreview.onBlur}
				>
					<span className={styles['count']}>{group.count}</span>
					<span className={styles['name']}>
						{group.name}{' '}
						<span className={styles['set-code']}>
							({top.setCode})
						</span>{' '}
						<BoardChips chips={annotations?.printingChips?.[top.uuid]} />
					</span>
					<ManaCost cost={top.manaCost} />
					{ownership}
				</button>
				<button
					type="button"
					className={styles['manage-row']}
					aria-label={`Edit ${group.name} copies`}
					onClick={() =>
						onCardEvent?.({
							type: CardInteractionEventType.MANAGE,
							payload: group
						})
					}
				>
					Edit
				</button>
			</div>
		);
	}

	return (
		<>
			<div className={styles['row-with-action']}>
				<button
					type="button"
					className={styles['row']}
					aria-expanded={expanded}
					aria-controls={expanded ? printingsId : undefined}
					onClick={() => onToggle(group.name)}
					onMouseEnter={topPreview.onMouseEnter}
					onFocus={topPreview.onFocus}
					onMouseLeave={topPreview.onMouseLeave}
					onBlur={topPreview.onBlur}
				>
					<span className={styles['count']}>{group.count}</span>
					<span className={styles['name']}>{group.name}</span>
					<ManaCost cost={top.manaCost} />
					{ownership}
					<span className={styles['thumbnails']} aria-hidden="true">
						{group.printings
							.slice(0, MAX_ROW_THUMBNAILS)
							.map((card) => (
								<img
									key={card.uuid}
									src={thumbnailOf(card)}
									alt=""
									loading="lazy"
								/>
							))}
					</span>
					<span className={styles['print-count']}>
						{group.printings.length}
						<span className={styles['print-count-label']}>
							{' '}
							prints
						</span>
					</span>
					<svg
						className={styles['caret']}
						viewBox="0 0 16 16"
						width="16"
						height="16"
						aria-hidden="true"
					>
						<path
							d="M4 6l4 4 4-4"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.8"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</button>
				<button
					type="button"
					className={styles['manage-row']}
					aria-label={`Edit ${group.name} copies and printings`}
					onClick={() =>
						onCardEvent?.({
							type: CardInteractionEventType.MANAGE,
							payload: group
						})
					}
				>
					Edit
				</button>
			</div>
			{expanded && (
				<ul
					id={printingsId}
					className={styles['printings']}
					aria-label={`${group.name} printings`}
				>
					{group.printings.map((card) => {
						const preview = previewHandlers(card, onCardEvent);
						return (
							<li key={card.uuid}>
								<button
									type="button"
									className={styles['printing']}
									aria-label={`${card.count} ${group.name}, ${card.setCode} printing${card.manaCost ? `, mana cost ${card.manaCost}` : ''}`}
									onClick={() =>
										onCardEvent?.({
											type: CardInteractionEventType.CLICK,
											payload: { card, group }
										})
									}
									onMouseEnter={preview.onMouseEnter}
									onFocus={preview.onFocus}
									onMouseLeave={preview.onMouseLeave}
									onBlur={preview.onBlur}
								>
									<img
										src={thumbnailOf(card)}
										alt=""
										loading="lazy"
									/>
									<span className={styles['printing-code']}>
										{card.setCode}{' '}
										<BoardChips chips={annotations?.printingChips?.[card.uuid]} />
									</span>
									<ManaCost cost={card.manaCost} />
									<span className={styles['printing-count']}>
										×{card.count}
									</span>
								</button>
							</li>
						);
					})}
				</ul>
			)}
		</>
	);
}

export type DecklistCategoryProps = {
	group: TypeGroup;
	name: string;
	annotations?: BoardAnnotations;
	isExpanded: (name: string) => boolean;
	onToggle: (name: string) => void;
	onCardEvent?: OnCardEvent;
};
export function DecklistCategory(props: DecklistCategoryProps) {
	const { group, name, annotations, isExpanded, onToggle, onCardEvent } = props;
	const cards = useMemo(
		() =>
			groupDeckCardsByName(group.cards).sort(
				compareDeckCardGroupsByManaCost
			),
		[group.cards]
	);
	return (
		<section className={styles['decklist-groups']}>
			<h3 className={styles['category-header']}>
				{`${name} (${group.count})`}
			</h3>
			<ul className={styles['rows']}>
				{cards.map((card) => (
					<li
						key={card.name}
						className={
							isExpanded(card.name)
								? styles['expanded']
								: undefined
						}
					>
						<CardRow
							group={card}
							annotations={annotations}
							expanded={isExpanded(card.name)}
							onToggle={onToggle}
							onCardEvent={onCardEvent}
						/>
					</li>
				))}
			</ul>
		</section>
	);
}

export type DecklistGroupProps = {
	groups: Array<{
		name: string;
		groupData: TypeGroup;
	}>;
	annotations?: BoardAnnotations;
	isExpanded: (name: string) => boolean;
	onToggle: (name: string) => void;
	onCardEvent?: OnCardEvent;
};
export function DecklistGroup(props: DecklistGroupProps) {
	const { groups, annotations, isExpanded, onToggle, onCardEvent } = props;
	return (
		<>
			{groups.map((options) => {
				const { groupData, name } = options;
				return (
					<DecklistCategory
						key={name}
						name={name}
						group={groupData}
						annotations={annotations}
						isExpanded={isExpanded}
						onToggle={onToggle}
						onCardEvent={onCardEvent}
					/>
				);
			})}
		</>
	);
}
