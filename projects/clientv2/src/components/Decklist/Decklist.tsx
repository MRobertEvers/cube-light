import React from 'react';
import { useState } from 'react';

import manaStyles from './mana.module.css';
import styles from './decklist.module.css';
import { SpotlightCard } from './SpotlightCard';
import { FetchDeckCardResponse } from '../../api/fetch-deck';
import { DecklistGroup } from './DecklistGroup';
import { DeckMappedData } from '../../workers/deck.worker.messages';

const colorMap: { [x: string]: string } = {
	W: 'rgb(252, 248, 219)',
	U: 'rgb(117, 188, 220)',
	B: 'rgb(50, 50, 50)',
	R: 'rgb(250, 127, 96)',
	G: 'rgb(90, 195, 126)'
};

function ManaSymbol(props: { symbol: string; size: number }) {
	const { symbol, size } = props;
	return (
		<span
			className={manaStyles['mana-symbol']}
			style={{
				backgroundColor: symbol in colorMap ? colorMap[symbol] : 'rgb(170, 170, 170)',
				width: `${size}px`,
				height: `${size}px`
			}}
		>
			<span className={manaStyles['mana-generic-number']}>
				{symbol in colorMap ? '' : symbol}
			</span>
		</span>
	);
}

function ManaCost(props: { manaCost: string }) {
	const { manaCost } = props;
	if (!manaCost) {
		return <div></div>;
	}
	const symbols = manaCost
		.split('{')
		.filter(Boolean)
		.map((symbol) => symbol.substr(0, symbol.length - 1));

	const size = 16;
	return (
		<div
			style={{
				width: `${symbols.length * size}px`
			}}
		>
			{symbols.map((symbol, index) => {
				return <ManaSymbol key={index} symbol={symbol} size={size} />;
			})}
		</div>
	);
}
function CardTableRows(props: { deck: DeckMappedData; setImageSource: any }) {
	const { deck, setImageSource } = props;
	let index = 0;
	const creatures: JSX.Element[] = [];
	const spells: JSX.Element[] = [];
	const lands: JSX.Element[] = [];

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
				<td colSpan={3}>{`${categoryName} (${count})`}</td>
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
					<td>
						<ManaCost manaCost={card.manaCost} />
					</td>
				</tr>
			);
			index++;
		}
	}
	const displayList = categoryArrays.flatMap((x) => x);

	return displayList;
}

export type DecklistCardInfo = FetchDeckCardResponse;
type DecklistProps = {
	name: string;
	deck: DeckMappedData;
	onCardClick?: (card: DecklistCardInfo) => void;
};

export function Decklist(props: DecklistProps) {
	const { name, deck, onCardClick } = props;
	const [imageSource, setImageSource] = useState(
		null as { card: DecklistCardInfo; position: { x: number; y: number } } | null
	);

	const spotlightCards: FetchDeckCardResponse[] = [];
	for (const cardType of Object.keys(deck.cardCategories)) {
		const { cards } = deck.cardCategories[cardType];

		for (const card of cards) {
			spotlightCards.push(card);
			if (spotlightCards.length === 4) {
				break;
			}
		}
		if (spotlightCards.length === 4) {
			break;
		}
	}

	return (
		<div className={styles['body']}>
			<div
				className={
					styles['hover-card'] + (imageSource ? ` ${styles['hover-card-visible']}` : '')
				}
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
				<div className={styles['decklist-spotlight']}>
					{spotlightCards.map((card) => (
						<SpotlightCard card={card} />
					))}
				</div>
				<div className={styles['decklist-groups']}>
					{Object.keys(deck.cardCategories).map((group) => {
						return (
							<DecklistGroup
								name={group}
								group={deck.cardCategories[group]}
								onCardClick={onCardClick}
							/>
						);
					})}
				</div>
			</div>
		</div>
	);
}
