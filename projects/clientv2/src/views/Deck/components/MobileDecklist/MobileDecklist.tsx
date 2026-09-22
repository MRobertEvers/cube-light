import React, { useMemo, useState } from 'react';
import type { FetchAPIDeckCardResponse } from '../../../../api/fetch-api-deck';
import { ManaCost } from '../../../../components/ManaCost/ManaCost';
import { OverflowMenu } from '../../../../components/OverflowMenu/OverflowMenu';
import type { BannerBlend } from '../../../../utils/banner-blend';
import type { BannerCrop } from '../../../../utils/banner-crop';
import type { DeckTopStyle } from '../../../../utils/deck-top-style';
import {
	DeckCardGroup,
	compareDeckCardGroupsByManaCost,
	groupDeckCardsByName
} from '../../../../utils/group-deck-cards';
import type { DeckMappedData } from '../../../../workers/deck.worker.messages';
import { SpotlightCard } from '../../../../widgets/SpotlightCard/SpotlightCard';

import styles from './mobile-decklist.module.css';

type MobileDecklistProps = {
	deck: DeckMappedData;
	banner: { art: string | null; name: string } | null;
	bannerCrop: BannerCrop;
	bannerBlend?: BannerBlend | null;
	topStyle: DeckTopStyle;
	deletingCardName: string | null;
	onEdit: (group: DeckCardGroup) => void;
	onView: (card: FetchAPIDeckCardResponse) => void;
	onDelete: (group: DeckCardGroup) => Promise<void>;
};

type MobileCardRowProps = Pick<
	MobileDecklistProps,
	'deletingCardName' | 'onEdit' | 'onView' | 'onDelete'
> & {
	group: DeckCardGroup;
};

function thumbnailOf(card: FetchAPIDeckCardResponse) {
	return card.images?.small ?? card.image;
}

function MobileCardRow(props: MobileCardRowProps) {
	const { group, deletingCardName, onEdit, onView, onDelete } = props;
	const [top] = group.printings;
	const [expanded, setExpanded] = useState(false);
	const deleting = deletingCardName === group.name;
	const printingsId = `mobile-printings-${group.name.replace(/\W+/g, '-')}`;

	return (
		<li className={expanded ? styles.expanded : undefined}>
			<div className={styles.row}>
				<button
					type="button"
					className={styles.rowMain}
					aria-expanded={
						group.printings.length > 1 ? expanded : undefined
					}
					aria-controls={
						expanded && group.printings.length > 1
							? printingsId
							: undefined
					}
					onClick={() => {
						if (group.printings.length > 1) setExpanded(!expanded);
						else onView(top);
					}}
					disabled={deleting}
				>
					<span className={styles.count}>{group.count}</span>
					<span className={styles.name}>{group.name}</span>
					<ManaCost cost={top.manaCost} />
					{group.printings.length === 1 ? (
						<span className={styles.setCode}>({top.setCode})</span>
					) : (
						<>
							<span
								className={styles.thumbnails}
								aria-hidden="true"
							>
								{group.printings.slice(0, 3).map((card) => (
									<img
										key={card.uuid}
										src={thumbnailOf(card)}
										alt=""
										loading="lazy"
									/>
								))}
							</span>
							<span className={styles.printCount}>
								{group.printings.length}
							</span>
							<svg
								className={styles.caret}
								viewBox="0 0 16 16"
								width="16"
								height="16"
								aria-hidden="true"
							>
								<path d="M4 6l4 4 4-4" />
							</svg>
						</>
					)}
				</button>
				<OverflowMenu
					label={`Actions for ${group.name}`}
					disabled={deleting}
				>
					<button type="button" onClick={() => onEdit(group)}>
						Edit
					</button>
					<button type="button" onClick={() => onView(top)}>
						View
					</button>
					<button
						type="button"
						className={styles.delete}
						onClick={() => void onDelete(group)}
					>
						Delete
					</button>
				</OverflowMenu>
			</div>
			{expanded && group.printings.length > 1 && (
				<ul
					id={printingsId}
					className={styles.printings}
					aria-label={`${group.name} printings`}
				>
					{group.printings.map((card) => (
						<li key={card.uuid}>
							<button type="button" onClick={() => onView(card)}>
								<img
									src={thumbnailOf(card)}
									alt=""
									loading="lazy"
								/>
								<span>{card.setCode}</span>
								<ManaCost cost={card.manaCost} />
								<strong>×{card.count}</strong>
							</button>
						</li>
					))}
				</ul>
			)}
		</li>
	);
}

export function MobileDecklist(props: MobileDecklistProps) {
	const {
		deck,
		banner,
		bannerCrop,
		bannerBlend,
		topStyle,
		deletingCardName,
		onEdit,
		onView,
		onDelete
	} = props;
	const categories = useMemo(
		() =>
			Object.keys(deck.cardCategories)
				.toSorted(
					(a, b) => Number(/Land/.test(a)) - Number(/Land/.test(b))
				)
				.map((name) => ({
					name,
					category: deck.cardCategories[name],
					cards: groupDeckCardsByName(
						deck.cardCategories[name].cards
					).sort(compareDeckCardGroupsByManaCost)
				})),
		[deck]
	);

	return (
		<div className={styles.body}>
			{banner && topStyle === 'card' && (
				<div className={styles.spotlight}>
					<SpotlightCard
						art={banner.art}
						name={banner.name}
						crop={bannerCrop}
						bannerBlend={bannerBlend}
						variant="mobile"
					/>
				</div>
			)}
			{categories.map((item) => (
				<section key={item.name} className={styles.category}>
					<h3>{`${item.name} (${item.category.count})`}</h3>
					<ul className={styles.rows}>
						{item.cards.map((group) => (
							<MobileCardRow
								key={group.name}
								group={group}
								deletingCardName={deletingCardName}
								onEdit={onEdit}
								onView={onView}
								onDelete={onDelete}
							/>
						))}
					</ul>
				</section>
			))}
		</div>
	);
}
