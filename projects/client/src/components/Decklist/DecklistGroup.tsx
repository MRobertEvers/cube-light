import { DeckGroupData } from '../../workers/deck.types';
import { FetchDeckCardResponse } from '../../api/fetch-deck';

import styles from './decklist-group.module.css';

export type DecklistGroupProps = {
	group: DeckGroupData;
	name: string;
	onCardClick?: (card: FetchDeckCardResponse) => void;
};
export function DecklistGroup(props: DecklistGroupProps) {
	const { group, name, onCardClick } = props;
	return (
		<div className={styles['container']}>
			<div className={styles['contents']}>
				<div className={styles['tab']}>
					<h3>{`${name} (${group.count})`}</h3>
				</div>
				<div className={styles['body']}>
					<ul>
						{group.cards.map((card) => {
							return (
								<li key={card.name} onClick={() => onCardClick?.(card)}>
									<span className={styles['item-count']}>{card.count}</span>
									{card.name}
								</li>
							);
						})}
					</ul>
				</div>
			</div>
		</div>
	);
}
