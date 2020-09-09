import { useState } from 'react';

import styles from './decklist.module.css';

type DecklistCardInfo = { name: string; count: string; image: string };
type DecklistProps = {
	name: string;
	cards: Array<DecklistCardInfo>;
};

export function Decklist(props: DecklistProps) {
	const { name, cards } = props;
	const [imageSource, setImageSource] = useState(
		null as { card: DecklistCardInfo; position: { x: number; y: number } } | null
	);

	return (
		<div className={styles['body']}>
			<div
				className={styles['hover-card'] + (imageSource ? ` ${styles['hover-card-visible']}` : '')}
				style={{
					left: imageSource ? imageSource.position.x - 180 : 0,
					top: imageSource ? imageSource.position.y - 120 : 0
				}}
			>
				{imageSource && (
					<img
						style={{
							borderRadius: '10px'
						}}
						src={imageSource.card.image}
					></img>
				)}
			</div>
			<h2 className={styles['deck-title']}>{name}</h2>

			<div className={styles['decklist-container']}>
				<table className={styles['decklist']}>
					<thead>
						<tr>
							<th></th>
							<th>Card Name</th>
						</tr>
					</thead>
					<tbody>
						{cards.map((card, index) => {
							return (
								<tr key={index}>
									<td>{card.count}</td>
									<td>
										<span
											onMouseLeave={() => setImageSource(null)}
											onMouseOver={(e) => {
												const node = e.currentTarget.getBoundingClientRect();
												setImageSource({
													card,
													position: {
														x: node.left,
														y: node.bottom
													}
												});
											}}
										>
											{card.name}
										</span>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
