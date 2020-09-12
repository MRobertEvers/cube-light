import type { DecklistCardInfo } from './Decklist';

import styles from './spotlight-card.module.css';

const BACKGROUND_COLOR = 'var(--theme-light-tuple)';

export function SpotlightCard(props: { card: DecklistCardInfo }) {
	const { card } = props;
	return (
		<div className={styles['spotlight-card-container']}>
			<div
				style={{
					backgroundImage: `
                    linear-gradient(
                        to right, 
                        rgba(${BACKGROUND_COLOR}, 0) 5%,
                        rgba(${BACKGROUND_COLOR}, .9) 45%,
                        rgba(${BACKGROUND_COLOR}, 1) 50%,
                        rgba(${BACKGROUND_COLOR}, 1)
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
