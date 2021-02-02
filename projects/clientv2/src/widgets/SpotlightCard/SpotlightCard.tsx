import React from 'react';

import styles from './spotlight-card.module.css';

const BACKGROUND_COLOR = 'var(--theme-light-tuple)';

export type SpotlightCardProps = {
	art: string;
	name: string;
};
export function SpotlightCard(props: SpotlightCardProps) {
	const { art, name } = props;
	return (
		<div className={styles['spotlight-card-container']}>
			<div
				style={{
					backgroundImage:
						art &&
						`
                        linear-gradient(
                            to right, 
                            rgba(${BACKGROUND_COLOR}, 0) 13px,
                            rgba(${BACKGROUND_COLOR}, .9) 120px,
                            rgba(${BACKGROUND_COLOR}, 1) 143px
                        ), 
                        url("${art}")
                    `
				}}
				className={styles['spotlight-card']}
			>
				<h2>{name}</h2>
			</div>
		</div>
	);
}
