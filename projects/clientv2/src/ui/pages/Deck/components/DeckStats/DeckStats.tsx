import React, { useMemo } from 'react';
import type { DeckCardEntry } from '../../../../../domain/models/deck';
import { ManaCost } from '../../../../kit/components/ManaCost/ManaCost';
import { deckStats, MANA_COLORS } from '../../../../../domain/deck/stats';

import styles from './deck-stats.module.css';

const COLOR_NAMES = {
	W: 'White',
	U: 'Blue',
	B: 'Black',
	R: 'Red',
	G: 'Green',
	C: 'Colorless'
} as const;

function percent(part: number, whole: number) {
	return whole ? `${Math.round((part / whole) * 100)}%` : '0%';
}

/** Main-board breakdown: creature split, mana curve, color pips and types. */
export function DeckStats(props: { cards: DeckCardEntry[] }) {
	const { cards } = props;
	const stats = useMemo(() => deckStats(cards), [cards]);
	const tallest = Math.max(
		1,
		...stats.curve.map((bucket) => bucket.creatures + bucket.nonCreatures)
	);
	const colors = MANA_COLORS.filter(
		(color) => color !== 'C' || stats.pips.C > 0
	);

	if (!cards.some((card) => card.count > 0))
		return (
			<section className={styles.stats} aria-label="Deck stats">
				<p className={styles.empty}>
					This deck is empty. Add cards to see its stats.
				</p>
			</section>
		);

	return (
		<section className={styles.stats} aria-label="Deck stats">
			<section className={styles.panel} aria-labelledby="stats-curve">
				<h2 id="stats-curve" className={styles.header}>
					Mana curve
				</h2>
				<div className={styles.body}>
					<dl className={styles.legend}>
						<div>
							<dt>
								<span
									className={`${styles.swatch} ${styles.creature}`}
								/>
								Creatures
							</dt>
							<dd>{stats.creatures}</dd>
						</div>
						<div>
							<dt>
								<span
									className={`${styles.swatch} ${styles.nonCreature}`}
								/>
								Noncreatures
							</dt>
							<dd>{stats.nonCreatures}</dd>
						</div>
						<div>
							<dt>
								<span className={styles.swatch} />
								Lands
							</dt>
							<dd>{stats.lands}</dd>
						</div>
					</dl>
					<ol className={styles.curve} aria-label="Nonland cards by mana value">
						{stats.curve.map((bucket) => {
							const total = bucket.creatures + bucket.nonCreatures;
							return (
								<li
									key={bucket.label}
									aria-label={`Mana value ${bucket.label}: ${total} cards, ${bucket.creatures} creatures and ${bucket.nonCreatures} noncreatures`}
								>
									<div className={styles.track} aria-hidden="true">
										<div
											className={styles.nonCreature}
											style={{
												height: `${(bucket.nonCreatures / tallest) * 100}%`
											}}
										/>
										<div
											className={styles.creature}
											style={{
												height: `${(bucket.creatures / tallest) * 100}%`
											}}
										/>
									</div>
									<span className={styles.bucket} aria-hidden="true">
										{bucket.label}
									</span>
									<span className={styles.count} aria-hidden="true">
										{total}
									</span>
								</li>
							);
						})}
					</ol>
					<p className={styles.average}>
						Average mana value
						<strong>
							{stats.averageManaValue === null
								? '—'
								: stats.averageManaValue.toFixed(2)}
						</strong>
					</p>
				</div>
			</section>
			<section className={styles.panel} aria-labelledby="stats-colors">
				<h2 id="stats-colors" className={styles.header}>
					Color pips
				</h2>
				<ul className={`${styles.body} ${styles.pips}`}>
					{colors.map((color) => (
						<li
							key={color}
							aria-label={`${COLOR_NAMES[color]}: ${stats.pips[color]} pips, ${percent(stats.pips[color], stats.totalPips)}`}
						>
							<span className={styles.symbol} aria-hidden="true">
								<ManaCost cost={`{${color}}`} />
							</span>
							<span className={styles.count} aria-hidden="true">
								{stats.pips[color]}
							</span>
							<span className={styles.percent} aria-hidden="true">
								{percent(stats.pips[color], stats.totalPips)}
							</span>
						</li>
					))}
				</ul>
			</section>
			<section className={styles.panel} aria-labelledby="stats-types">
				<h2 id="stats-types" className={styles.header}>
					Card types
				</h2>
				<ul className={`${styles.body} ${styles.types}`}>
					{stats.types.map((type) => (
						<li key={type.type}>
							<div className={styles.typeRow}>
								<span>{type.type}</span>
								<span>{type.count}</span>
							</div>
							{type.subtypes.length > 0 && (
								<ul className={styles.subtypes}>
									{type.subtypes.map((subtype) => (
										<li
											key={subtype.name}
											className={styles.subtypeRow}
										>
											<span>{subtype.name}</span>
											<span>{subtype.count}</span>
										</li>
									))}
								</ul>
							)}
						</li>
					))}
				</ul>
			</section>
		</section>
	);
}
