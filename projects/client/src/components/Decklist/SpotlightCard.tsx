import type { DecklistCardInfo } from './Decklist';

import styles from './spotlight-card.module.css';

export function SpotlightCard(props: { card: DecklistCardInfo }) {
	const { card } = props;
	return (
		<div className={styles['spotlight-card-container']}>
			<div
				style={{
					backgroundImage: `
                    linear-gradient(
                        to right, 
                        rgba(255, 255, 255, 0) 5%,
                        rgba(255, 255, 255, .9) 45%,
                        rgba(255, 255, 255, 1) 50%,
                        rgba(255, 255, 255, 1)
                    ), 
                    url("${card.art}")`
				}}
				className={styles['spotlight-card']}
			>
				{card.name}
			</div>
		</div>
	);
}
