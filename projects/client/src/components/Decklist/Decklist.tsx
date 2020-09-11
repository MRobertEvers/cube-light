import { useState, useMemo } from 'react';
import type { DeckMappedData } from '../../workers/deck.types';
import styles from './decklist.module.css';

function CardTableRows(props: { deck: DeckMappedData; setImageSource: any }) {
	const { deck, setImageSource } = props;
	let index = 0;
	const creatures = [];
	const spells = [];
	const lands = [];

	const categoryArrays = [creatures, spells, lands];
	for (const cardType of Object.keys(deck.cardCategories)) {
		const { cards, count } = deck.cardCategories[cardType];

		let categoryName = 'Spells';
		let categoryArray = spells;
		if (cardType.toLowerCase().indexOf('creature') >= 0) {
			categoryName = 'Creatures';
			categoryArray = creatures;
		} else if (cardType.toLowerCase().indexOf('land') >= 0) {
			categoryName = 'Lands';
			categoryArray = lands;
		}

		categoryArray.push(
			<tr key={index} className={styles['decklist-category']}>
				<td colSpan={2}>{`${categoryName} (${count})`}</td>
			</tr>
		);

		index++;
		for (const card of cards) {
			categoryArray.push(
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
	const displayList = (categoryArrays as any).flatMap((x) => x);

	return displayList;
}

type DecklistCardInfo = { name: string; count: string; image: string };
type DecklistProps = {
	name: string;
	deck: DeckMappedData;
};

export function Decklist(props: DecklistProps) {
	const { name, deck } = props;
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
			<div className={styles['deck-header']}>
				<div className={styles['deck-header-container']}>
					<h2 className={styles['deck-title']}>{name}</h2>
					{/* <div className={styles['deck-card-count']}>{deck.count}</div> */}
				</div>
			</div>
			<div className={styles['decklist-container']}>
				<table className={styles['decklist']}>
					<tbody>
						<CardTableRows deck={deck} setImageSource={setImageSource} />
					</tbody>
				</table>
			</div>
		</div>
	);
}
