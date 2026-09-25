import React, { useState } from 'react';
import type { CardPreviewDetails } from '../../../domain/models/card';
import { ManaText } from '../../kit/components/ManaCost/ManaCost';

import styles from './card-previewer.module.css';

const FORMAT_NAMES: Record<string, string> = {
	standard: 'Standard',
	pioneer: 'Pioneer',
	modern: 'Modern',
	legacy: 'Legacy',
	vintage: 'Vintage',
	commander: 'Commander',
	pauper: 'Pauper',
	paupercommander: 'Pauper Commander',
	oathbreaker: 'Oathbreaker',
	brawl: 'Brawl',
	standardbrawl: 'Standard Brawl',
	historic: 'Historic',
	timeless: 'Timeless',
	alchemy: 'Alchemy',
	gladiator: 'Gladiator',
	penny: 'Penny Dreadful',
	premodern: 'Premodern',
	oldschool: 'Old School',
	predh: 'PreDH',
	duel: 'Duel Commander',
	future: 'Future'
};
const MAIN_FORMATS = ['standard', 'commander', 'modern'];

function capitalize(value: string) {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Power and toughness, or loyalty, or defense; null for cards with none. */
export function cardStats(details: CardPreviewDetails): string | null {
	return details.power != null && details.toughness != null
		? `${details.power} / ${details.toughness}`
		: (details.loyalty ?? details.defense);
}

/** A card's type line, rules and flavor text, stats, credit and format legality. */
export function CardRulesText(props: { details: CardPreviewDetails; className: string }) {
	const { details, className } = props;
	const [showAllFormats, setShowAllFormats] = useState(false);

	const stats = cardStats(details);
	const formats = Object.keys(FORMAT_NAMES).filter(
		(format) =>
			showAllFormats ||
			MAIN_FORMATS.includes(format) ||
			// Keep a banned/restricted note visible even when collapsed.
			/banned|restricted/i.test(details.legalities[format] ?? '')
	);

	return (
		<div className={className}>
			{details.type && <p className={styles['type']}>{details.type}</p>}
			{(details.text || details.flavorText) && (
				<div className={styles['rules']}>
					{details.text?.split('\n').map((line, i) => (
						<p key={i}>
							<ManaText text={line} />
						</p>
					))}
					{details.flavorText && (
						<p className={styles['flavor']}>{details.flavorText}</p>
					)}
				</div>
			)}
			{(details.rarity || stats) && (
				<div className={styles['rarity-row']}>
					<span>{details.rarity && capitalize(details.rarity)}</span>
					{stats && <strong>{stats}</strong>}
				</div>
			)}
			{(details.number || details.artist) && (
				<p className={styles['credit']}>
					{details.number && `#${details.number}`}
					{details.artist && ` Illustrated by ${details.artist}`}
				</p>
			)}
			<dl className={styles['legalities']}>
				{formats.map((format) => (
					<div key={format}>
						<dt>{FORMAT_NAMES[format]}</dt>
						<dd
							data-status={(
								details.legalities[format] ?? 'not legal'
							).toLowerCase()}
						>
							{details.legalities[format] ?? 'Not Legal'}
						</dd>
					</div>
				))}
			</dl>
			<button
				type="button"
				className={styles['formats-toggle']}
				onClick={() => setShowAllFormats((shown) => !shown)}
			>
				{showAllFormats ? 'Show Fewer Formats' : 'Show All Formats'}
			</button>
		</div>
	);
}
