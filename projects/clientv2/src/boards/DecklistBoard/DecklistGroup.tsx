import React, { useMemo } from 'react';
import { FetchAPIDeckCardResponse } from '../../api/fetch-api-deck';
import { ManaCost } from '../../components/ManaCost/ManaCost';
import { DeckGroupData } from '../../workers/deck.worker.messages';
import {
	DeckCardGroup,
	compareDeckCardGroupsByManaCost,
	groupDeckCardsByName
} from '../../utils/group-deck-cards';

import { otherBoard } from '../../utils/deck-boards';
import styles from './decklist-group.module.css';

/** Moves the whole row to the other board; the editor moves single copies. */
function MoveRowButton(props: {
	group: DeckCardGroup;
	busy: boolean;
	onCardEvent?: OnCardEvent;
}) {
	const { group, busy, onCardEvent } = props;
	const to = otherBoard(group.board) === 'side' ? 'sideboard' : 'main board';
	return (
		<button
			type="button"
			className={styles['move-row']}
			aria-label={`Move ${group.count === 1 ? '' : `all ${group.count} `}${group.name} to the ${to}`}
			title={`Move to the ${to}`}
			disabled={busy}
			onClick={() =>
				onCardEvent?.({
					type: CardInteractionEventType.MOVE,
					payload: group
				})
			}
		>
			<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
				<path
					d={
						group.board === 'main'
							? 'M8 3v9.5M4.5 9 8 12.5 11.5 9'
							: 'M8 13V3.5M4.5 7 8 3.5 11.5 7'
					}
					fill="none"
					stroke="currentColor"
					strokeWidth="1.8"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</button>
	);
}

export enum CardInteractionEventType {
	CLICK = 'CardInteractionEvent/CLICK',
	MANAGE = 'CardInteractionEvent/MANAGE',
	MOVE = 'CardInteractionEvent/MOVE',
	HOVER = 'CardInteractionEvent/HOVER',
	LEAVE = 'CardInteractionEvent/LEAVE'
}

export type CardInteractionEvent =
	| {
			type: CardInteractionEventType.CLICK;
			/** The printing clicked, and every printing of its name. */
			payload: { card: FetchAPIDeckCardResponse; group: DeckCardGroup };
	  }
	| {
			type: CardInteractionEventType.MANAGE;
			payload: DeckCardGroup;
	  }
	| {
			/** Every copy of the group goes to the other board. */
			type: CardInteractionEventType.MOVE;
			payload: DeckCardGroup;
	  }
	| {
			type: CardInteractionEventType.LEAVE;
			payload: FetchAPIDeckCardResponse;
	  }
	| {
			type: CardInteractionEventType.HOVER;
			payload: {
				card: FetchAPIDeckCardResponse;
				position: {
					x: number;
					y: number;
				};
			};
	  };

type OnCardEvent = (event: CardInteractionEvent) => void;

/** Thumbnails shown in a collapsed row; more printings than this are summed in the pill. */
const MAX_ROW_THUMBNAILS = 3;

function thumbnailOf(card: FetchAPIDeckCardResponse) {
	return card.images?.small ?? card.image;
}

/** Hover and focus handlers that preview `card` beside the element. */
function previewHandlers(
	card: FetchAPIDeckCardResponse,
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
	/** True while this row's move or delete is saving. */
	busy: boolean;
	expanded: boolean;
	onToggle: (name: string) => void;
	onCardEvent?: OnCardEvent;
};

function CardRow(props: CardRowProps) {
	const { group, busy, expanded, onToggle, onCardEvent } = props;
	const [top] = group.printings;
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
					{...previewHandlers(top, onCardEvent)}
				>
					<span className={styles['count']}>{group.count}</span>
					<span className={styles['name']}>
						{group.name}{' '}
						<span className={styles['set-code']}>
							({top.setCode})
						</span>
					</span>
					<ManaCost cost={top.manaCost} />
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
				<MoveRowButton
					group={group}
					busy={busy}
					onCardEvent={onCardEvent}
				/>
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
					{...previewHandlers(top, onCardEvent)}
				>
					<span className={styles['count']}>{group.count}</span>
					<span className={styles['name']}>{group.name}</span>
					<ManaCost cost={top.manaCost} />
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
				<MoveRowButton
					group={group}
					busy={busy}
					onCardEvent={onCardEvent}
				/>
			</div>
			{expanded && (
				<ul
					id={printingsId}
					className={styles['printings']}
					aria-label={`${group.name} printings`}
				>
					{group.printings.map((card) => (
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
								{...previewHandlers(card, onCardEvent)}
							>
								<img
									src={thumbnailOf(card)}
									alt=""
									loading="lazy"
								/>
								<span className={styles['printing-code']}>
									{card.setCode}
								</span>
								<ManaCost cost={card.manaCost} />
								<span className={styles['printing-count']}>
									×{card.count}
								</span>
							</button>
						</li>
					))}
				</ul>
			)}
		</>
	);
}

export type DecklistCategoryProps = {
	group: DeckGroupData;
	name: string;
	/** The row with a move in flight, by card name. */
	busyName?: string | null;
	isExpanded: (name: string) => boolean;
	onToggle: (name: string) => void;
	onCardEvent?: OnCardEvent;
};
export function DecklistCategory(props: DecklistCategoryProps) {
	const { group, name, busyName, isExpanded, onToggle, onCardEvent } = props;
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
							busy={busyName === card.name}
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
		groupData: DeckGroupData;
	}>;
	busyName?: string | null;
	isExpanded: (name: string) => boolean;
	onToggle: (name: string) => void;
	onCardEvent?: OnCardEvent;
};
export function DecklistGroup(props: DecklistGroupProps) {
	const { groups, ...rest } = props;
	return (
		<>
			{groups.map((options) => {
				const { groupData, name } = options;
				return (
					<DecklistCategory
						key={name}
						name={name}
						group={groupData}
						{...rest}
					/>
				);
			})}
		</>
	);
}
