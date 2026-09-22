import React, { useMemo } from 'react';
import { FetchAPIDeckCardResponse } from '../../../../api/fetch-api-deck';
import { DeckGroupData } from '../../../../workers/deck.worker.messages';
import {
	DeckCardGroup,
	compareDeckCardGroupsByManaCost,
	groupDeckCardsByName
} from '../../../../utils/group-deck-cards';

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
			payload: { card: FetchAPIDeckCardResponse; group: DeckCardGroup };
	  }
	| {
			type: CardInteractionEventType.MANAGE;
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

const MANA_COLORS: Record<string, string> = {
	W: '#f8f3d6',
	U: '#aad4ee',
	B: '#c9c1bd',
	R: '#f2a98e',
	G: '#9fd3b0'
};

function ManaCost(props: { cost: string }) {
	const { cost } = props;
	if (!cost) return null;
	return (
		<span className={styles['mana-cost']} aria-label={`Mana cost: ${cost}`}>
			{cost.split(/(\{[^}]+\})/).map((part, index) => {
				const symbol = /^\{([^}]+)\}$/.exec(part)?.[1];
				if (!symbol) return part;
				const colors = symbol.split('/').map((value) => MANA_COLORS[value] ?? '#d6d2cf');
				return (
					<abbr
						key={index}
						className={styles['mana-symbol']}
						title={part}
						style={{
							background: colors.length > 1
								? `linear-gradient(135deg, ${colors[0]} 50%, ${colors[1]} 50%)`
								: colors[0]
						}}
					>
						{symbol}
					</abbr>
				);
			})}
		</span>
	);
}

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
	expanded: boolean;
	editable: boolean;
	onToggle: (name: string) => void;
	onCardEvent?: OnCardEvent;
};

function CardRow(props: CardRowProps) {
	const { group, expanded, editable, onToggle, onCardEvent } = props;
	const [top] = group.printings;
	const printingsId = `printings-${group.name.replace(/\W+/g, '-')}`;

	if (group.printings.length === 1) {
		return (
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
					<span className={styles['set-code']}>({top.setCode})</span>
				</span>
				<ManaCost cost={top.manaCost} />
			</button>
		);
	}

	return (
		<>
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
					<span className={styles['print-count-label']}> prints</span>
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
					{editable && (
						<li>
							<button
								type="button"
								className={styles['manage']}
								onClick={() =>
									onCardEvent?.({
										type: CardInteractionEventType.MANAGE,
										payload: group
									})
								}
							>
								Manage printings
							</button>
						</li>
					)}
				</ul>
			)}
		</>
	);
}

export type DecklistCategoryProps = {
	group: DeckGroupData;
	name: string;
	editable: boolean;
	isExpanded: (name: string) => boolean;
	onToggle: (name: string) => void;
	onCardEvent?: OnCardEvent;
};
export function DecklistCategory(props: DecklistCategoryProps) {
	const { group, name, editable, isExpanded, onToggle, onCardEvent } = props;
	const cards = useMemo(
		() => groupDeckCardsByName(group.cards).sort(compareDeckCardGroupsByManaCost),
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
							expanded={isExpanded(card.name)}
							editable={editable}
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
	editable: boolean;
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
