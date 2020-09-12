import { DeckGroupData } from '../../workers/deck.types';

import styles from './decklist-group.module.css';

export function DecklistGroup(props: { group: DeckGroupData; name: string }) {
	const { group, name } = props;
	return (
		<div className={styles['container']}>
			<div className={styles['contents']}>
				<div className={styles['tab']}>
					<h3>{`${name} (${group.count})`}</h3>
				</div>
				<div className={styles['body']}>
					<ul>
						{group.cards.map((card) => {
							return <li>{card.name}</li>;
						})}
					</ul>
				</div>
			</div>
		</div>
	);
}
