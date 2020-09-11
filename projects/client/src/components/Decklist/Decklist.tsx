import { useState } from 'react';
import type { DeckMappedData } from '../../workers/deck.types';
import styles from './decklist.module.css';

type DecklistCardInfo = { name: string; count: string; image: string };
type DecklistProps = {
	name: string;
	cards: DeckMappedData;
};

export function Decklist(props: DecklistProps) {
	const { name, cards } = props;
	const [imageSource, setImageSource] = useState(
		null as { card: DecklistCardInfo; position: { x: number; y: number } } | null
	);

	let index = 0;
	const categoryArrays = [];
	for (const cardType of Object.keys(cards)) {
		const count = cards[cardType].reduce((acc, card) => acc + Number.parseInt(card.count), 0);
		categoryArrays.push(
			<tr key={index} className={styles['decklist-category']}>
				<td colSpan={2}>{`${cardType} (${count})`}</td>
			</tr>
		);

		index++;
		for (const card of cards[cardType]) {
			categoryArrays.push(
				<tr key={index}>
					<td className={styles['decklist-card-count']}>{card.count}</td>
					<td className="wow">
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
							<div className={styles['decklist-card-type']}>{card.types}</div>
						</span>
					</td>
				</tr>
			);
			index++;
		}
	}
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
					{/* <thead>
						<tr>
							<th></th>
							<th></th>
						</tr>
					</thead> */}
					<tbody>{categoryArrays}</tbody>
				</table>
			</div>
		</div>
	);
}
