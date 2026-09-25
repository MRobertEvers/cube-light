import { useCardHoverPreview } from '../CardPreviewer/use-card-hover-preview';
import React, { useCallback, useMemo } from 'react';
import { DecklistBoard } from '../boards/DecklistBoard/DecklistBoard';
import { MobileDecklistBoard } from '../boards/MobileDecklistBoard/MobileDecklistBoard';
import type { BoardAnnotations, BoardCardEvent, BoardChip, BoardSection } from '../boards/board.types';
import { useIsPhoneLayout } from '../../kit/hooks/useIsPhoneLayout';
import { groupBoardCards } from '../../../domain/deck/grouping';
import { DEFAULT_BANNER_CROP } from '../../../domain/appearance/banner-crop';
import type { DeckCardEntry } from '../../../domain/models/deck';
import type { DeckCardGroup } from '../../../domain/deck/group-deck-cards';
import { collectionCardsIn, unplacedOf, type PlacementFilter } from '../../../domain/library/placements';
import type { StorageLocationSummaries } from '../../../domain/models/library';
import { selectCollection, selectStorageLocations } from '../../../redux/library/library.selectors';
import { removeCollectionCards } from '../../../redux/library/library.thunks';
import type { GroupedCollection } from '../../../redux/library/library.types';
import { useAppDispatch } from '../../../redux/use-app-dispatch';
import { useAppSelector } from '../../../redux/use-app-selector';

const NO_LOCATIONS: StorageLocationSummaries = [];
const EMPTY_BOARD = groupBoardCards([]);

type CollectionBoardReduxWidgetProps = {
	collectionId: string;
	filter: PlacementFilter;
	onViewCard: (card: DeckCardEntry, group: DeckCardGroup) => void;
	onEditCard: (group: DeckCardGroup) => void;
	onMoveCard: (group: DeckCardGroup) => void;
};

/** Where each printing's copies are kept, as chips: each location, then any unplaced remainder. */
function placementChips(collection: GroupedCollection, locations: StorageLocationSummaries): Record<string, BoardChip[]> {
	const names = new Map(locations.map((location) => [location.locationId, location.name]));
	const chips: Record<string, BoardChip[]> = {};
	for (const card of collection.cards) {
		const list: BoardChip[] = Object.entries(collection.stored[card.uuid] ?? {})
			.sort((a, b) => b[1] - a[1])
			.map((entry) => ({ label: `${names.get(entry[0]) ?? 'Location'} ×${entry[1]}`, tone: 'neutral' }));
		const unplaced = unplacedOf(collection, card);
		if (unplaced > 0 && list.length) list.push({ label: `${unplaced} unplaced`, tone: 'partial' });
		const orphaned = collection.orphaned[card.uuid] ?? 0;
		if (orphaned > 0) list.push({ label: `${orphaned} was in a removed location`, tone: 'missing' });
		if (list.length) chips[card.uuid] = list;
	}
	return chips;
}

/**
 * A collection's cards, drawn by the deck list's board pair: the desktop board, or the
 * mobile board on phones. Copies carry chips naming where they are kept.
 */
export function CollectionBoardReduxWidget(props: CollectionBoardReduxWidgetProps) {
	const { collectionId, filter, onViewCard, onEditCard, onMoveCard } = props;
	const dispatch = useAppDispatch();
	const isPhoneLayout = useIsPhoneLayout();
	const HoverPreview = useCardHoverPreview();
	const collection = useAppSelector((root) => selectCollection(root, collectionId));
	const locations = useAppSelector(selectStorageLocations) ?? NO_LOCATIONS;
	const cards = useMemo(
		() => (collection ? { main: groupBoardCards(collectionCardsIn(collection, filter)), side: EMPTY_BOARD } : null),
		[collection, filter]
	);
	const annotations = useMemo<BoardAnnotations | undefined>(
		() => (collection ? { printingChips: placementChips(collection, locations) } : undefined),
		[collection, locations]
	);
	const sections = useMemo<BoardSection[]>(
		() => [
			{
				board: 'main',
				label: filter.type === 'all' ? 'Cards' : filter.type === 'unplaced' ? 'Unplaced' : (locations.find((location) => location.locationId === filter.locationId)?.name ?? 'Location'),
				empty: filter.type === 'all' ? 'No cards yet. Add a card or paste a list.' : 'No copies here.'
			}
		],
		[filter, locations]
	);
	const onCardEvent = useCallback(
		(event: BoardCardEvent) => {
			switch (event.type) {
				case 'view':
					onViewCard(event.card, event.group);
					break;
				case 'edit':
					onEditCard(event.group);
					break;
				case 'move':
					onMoveCard(event.group);
					break;
				case 'delete':
					void dispatch(removeCollectionCards(collectionId, event.group.printings.map((card) => card.uuid)));
					break;
			}
		},
		[collectionId, dispatch, onEditCard, onMoveCard, onViewCard]
	);
	if (!collection || !cards) return null;
	return isPhoneLayout ? (
		<MobileDecklistBoard
			cards={cards}
			busyGroup={null}
			onCardEvent={onCardEvent}
			annotations={annotations}
			sections={sections}
			moveLabel="Move to collection…"
			deleteLabel="Remove from collection"
			banner={null}
			bannerCrop={DEFAULT_BANNER_CROP}
			bannerBlend={null}
			topStyle="card"
		/>
	) : (
		<DecklistBoard
			HoverPreview={HoverPreview}
			cards={cards}
			busyGroup={null}
			onCardEvent={onCardEvent}
			annotations={annotations}
			sections={sections}
			banner={null}
			bannerCrop={DEFAULT_BANNER_CROP}
			bannerBlend={null}
			topStyle="card"
		/>
	);
}
