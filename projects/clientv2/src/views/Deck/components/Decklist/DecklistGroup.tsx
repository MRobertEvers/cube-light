import React from 'react';
import { FetchAPIDeckCardResponse } from '../../../../api/fetch-api-deck';
import { DeckGroupData } from '../../../../workers/deck.worker.messages';

import styles from './decklist-group.module.css';

export enum CardInteractionEventType {
	CLICK = 'CardInteractionEvent/CLICK',
	HOVER = 'CardInteractionEvent/HOVER',
	LEAVE = 'CardInteractionEvent/LEAVE'
}

export type CardInteractionEvent =
	| {
			type: CardInteractionEventType.CLICK;
			payload: FetchAPIDeckCardResponse;
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

export type DecklistCategoryProps = {
	group: DeckGroupData;
	name: string;
	onCardEvent?: (event: CardInteractionEvent) => void;
};
export function DecklistCategory(props: DecklistCategoryProps) {
	const { group, name, onCardEvent } = props;
	return (
		<>
			<tr className={styles['category-header']}>
				<th colSpan={2}>{`${name} (${group.count})`}</th>
			</tr>
			{group.cards.map((card) => {
				return (
					<tr
						key={card.name}
						onClick={() =>
							onCardEvent?.({
								type: CardInteractionEventType.CLICK,
								payload: card
							})
						}
					>
						<td>{card.count}</td>
						<td>
							<a
								onClick={(e) => e.preventDefault()}
								onMouseLeave={() =>
									onCardEvent?.({
										type: CardInteractionEventType.LEAVE,
										payload: card
									})
								}
								onMouseOver={(e) => {
									const node = e.currentTarget.getBoundingClientRect();
									onCardEvent?.({
										type: CardInteractionEventType.HOVER,
										payload: {
											card,
											position: {
												x: node.left,
												y: node.bottom
											}
										}
									});
								}}
							>
								{card.name}
							</a>
						</td>
					</tr>
				);
			})}
		</>
	);
}

export type DecklistGroupProps = {
	groups: Array<{
		name: string;
		groupData: DeckGroupData;
	}>;
	onCardEvent?: (event: CardInteractionEvent) => void;
};
export function DecklistGroup(props: DecklistGroupProps) {
	const { groups, onCardEvent } = props;
	return (
		<>
			{groups.map(({ groupData, name }) => {
				return (
					<table key={name} className={styles['decklist-groups']}>
						<tbody>
							<DecklistCategory
								key={name}
								name={name}
								group={groupData}
								onCardEvent={onCardEvent}
							/>
						</tbody>
					</table>
				);
			})}
		</>
	);
}
