import React, { useEffect, useState } from 'react';
import {
	fetchAPICardDetails,
	FetchAPICardDetailsResponse
} from '../../../../api/fetch-api-card-details';
import { FetchAPIDeckCardResponse } from '../../../../api/fetch-api-deck';

import { HeaderBackButton } from 'src/components/BackLink/BackLink';
import {
	HeaderBackSlot,
	HeaderBackSlotContext
} from 'src/components/Header/HeaderBackSlot';
import styles from './edit-card.module.css';

export type CardPreviewModalProps = {
	card: FetchAPIDeckCardResponse | null;
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

const MANA_COLORS: Record<string, string> = {
	W: '#f8f3d6',
	U: '#aad4ee',
	B: '#c9c1bd',
	R: '#f2a98e',
	G: '#9fd3b0'
};

/** Renders rules text, drawing {X} costs as small mana pips. */
function ManaText(props: { text: string }) {
	return (
		<>
			{props.text.split(/(\{[^}]+\})/).map((part, i) => {
				const symbol = /^\{([^}]+)\}$/.exec(part)?.[1];
				if (!symbol) return part;
				const colors = symbol
					.split('/')
					.map((c) => MANA_COLORS[c])
					.filter(Boolean);
				const background =
					colors.length > 1
						? `linear-gradient(135deg, ${colors[0]} 50%, ${colors[1]} 50%)`
						: (colors[0] ?? '#d6d2cf');
				return (
					<abbr
						key={i}
						className={styles['mana']}
						style={{ background }}
						title={part}
					>
						{symbol === 'T' ? '⟳' : symbol.replace('/', '')}
					</abbr>
				);
			})}
		</>
	);
}

function capitalize(value: string) {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

function CardText(props: { details: FetchAPICardDetailsResponse }) {
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
	const uuid = card?.uuid;
	const [details, setDetails] = useState<FetchAPICardDetailsResponse | null>(
		null
	);
	// State, not a ref, so the back button portals in once the slot mounts.
	const [backSlot, setBackSlot] = useState<HTMLElement | null>(null);

	useEffect(() => {
		setDetails(null);
		if (!uuid) return;
		let cancelled = false;
		fetchAPICardDetails(uuid)
			.then((result) => {
				if (!cancelled) setDetails(result);
			})
			.catch(() => {
				// The image alone is still a usable preview.
			});
		return () => {
			cancelled = true;
		};
	}, [uuid]);

	useEffect(() => {
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', closeOnEscape);
		return () => window.removeEventListener('keydown', closeOnEscape);
	}, [onClose]);

	if (!card) return null;

	return (
		<section
			className={styles['container']}
			role="dialog"
			aria-modal="true"
			aria-labelledby="card-modal-title"
		>
			<header className={styles['header']}>
				<HeaderBackSlot ref={setBackSlot} />
				<HeaderBackSlotContext.Provider value={backSlot}>
					{/* Phones fill the screen and close from here instead of ×. */}
					<HeaderBackButton
						label="Close card preview"
						onClick={onClose}
					/>
				</HeaderBackSlotContext.Provider>
				<div className={styles['title']}>
					<h2 id="card-modal-title">
						{card.name}
						{card.manaCost && (
							<span className={styles['cost']}>
								<ManaText text={card.manaCost} />
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
				{details && <CardText details={details} />}
			</div>
		</section>
	);
}
