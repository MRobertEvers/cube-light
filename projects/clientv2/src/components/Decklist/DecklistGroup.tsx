import React from 'react';
import { FetchDeckCardResponse } from '../../api/fetch-api-deck';
import { DeckGroupData } from '../../workers/deck.worker.messages';

import styles from './decklist-group.module.css';

export type DecklistCategoryProps = {
	group: DeckGroupData;
	name: string;
	onCardClick?: (card: FetchDeckCardResponse) => void;
};
export function DecklistCategory(props: DecklistCategoryProps) {
	const { group, name, onCardClick } = props;
	return (
		<>
			<tr className={styles['category-header']}>
				<th colSpan={2}>{`${name} (${group.count})`}</th>
			</tr>
			{group.cards.map((card) => {
				return (
					<tr key={card.name} onClick={() => onCardClick?.(card)}>
						<td>{card.count}</td>
						<td>
							<a rel="popover" href={card.name}>
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
	onCardClick?: (card: FetchDeckCardResponse) => void;
};
export function DecklistGroup(props: DecklistGroupProps) {
	const { groups, onCardClick } = props;
	return (
		<table className={styles['decklist-groups']}>
			<tbody>
				{groups.map(({ groupData, name }) => {
					return (
						<DecklistCategory name={name} group={groupData} onCardClick={onCardClick} />
					);
				})}
			</tbody>
		</table>
	);
}
