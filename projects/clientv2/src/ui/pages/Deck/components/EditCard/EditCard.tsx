import React, { useEffect, useState } from 'react';
import type { CardPreviewDetails } from '../../../../../domain/models/card';
import { DeckCardEntry } from '../../../../../domain/models/deck';
import { ManaCost, ManaText } from '../../../../kit/components/ManaCost/ManaCost';

import { HeaderBackButton } from 'src/ui/kit/components/BackLink/BackLink';
import { useCloseOnEscape } from 'src/ui/kit/hooks/useCloseOnEscape';
import { HeaderBackSlot } from 'src/ui/kit/components/Header/HeaderBackSlot';
import styles from './edit-card.module.css';

export type CardPreviewModalProps = {
	card: DeckCardEntry | null;
	onClose: () => void;
};

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

function CardText(props: { details: CardPreviewDetails }) {
	const { details } = props;
	const [showAllFormats, setShowAllFormats] = useState(false);

	const stats =
		details.power != null && details.toughness != null
			? `${details.power} / ${details.toughness}`
			: (details.loyalty ?? details.defense);
	const formats = Object.keys(FORMAT_NAMES).filter(
		(format) =>
			showAllFormats ||
			MAIN_FORMATS.includes(format) ||
			// Keep a banned/restricted note visible even when collapsed.
			/banned|restricted/i.test(details.legalities[format] ?? '')
	);

	return (
		<div className={styles['details']}>
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

/** A large image of one printing in the deck, with its rules text. Editing copies is ManagePrintings' job. */
export function CardPreviewModal(props: CardPreviewModalProps) {
	const { card, onClose } = props;

	useCloseOnEscape(onClose);

	if (!card) return null;

	return (
		<section
			className={styles['container']}
			role="dialog"
			aria-modal="true"
			aria-labelledby="card-modal-title"
		>
			<header className={styles['header']}>
				<HeaderBackSlot>
					{/* Phones fill the screen and close from here instead of ×. */}
					<HeaderBackButton
						inline
						label="Close card preview"
						onClick={onClose}
					/>
				</HeaderBackSlot>
				<div className={styles['title']}>
					<h2 id="card-modal-title">
						{card.name}
						{card.manaCost && (
							<span className={styles['cost']}>
								<ManaCost cost={card.manaCost} />
							</span>
						)}
					</h2>
					<p>
						{card.count} × {card.setCode} printing
					</p>
				</div>
				<button
					className={styles['close']}
					type="button"
					aria-label="Close card preview"
					onClick={onClose}
				>
					×
				</button>
			</header>
			<div className={styles['body']}>
				<div className={styles['image-panel']}>
					<img
						src={card.images?.normal ?? card.image}
						alt={`${card.name}, ${card.setCode} printing`}
					/>
				</div>
				<CardText key={card.uuid} details={card} />
			</div>
		</section>
	);
}
