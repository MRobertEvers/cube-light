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
                            rgba(${BACKGROUND_COLOR}, 0) 13px,
                            rgba(${BACKGROUND_COLOR}, .9) 120px,
                            rgba(${BACKGROUND_COLOR}, 1) 143px
                        ), 
                        url("${card.art}")
                    `
				}}
				className={styles['spotlight-card']}
			>
				<h2>{card.name}</h2>
			</div>
		</div>
	);
}
