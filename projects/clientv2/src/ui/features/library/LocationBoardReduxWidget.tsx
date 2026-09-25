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
import { locationCardsFrom } from '../../../domain/library/placements';
import { selectLocation } from '../../../redux/library/library.selectors';
import { placeCollectionCards } from '../../../redux/library/library.thunks';
import type { GroupedLocation } from '../../../redux/library/library.types';
import { useAppDispatch } from '../../../redux/use-app-dispatch';
import { useAppSelector } from '../../../redux/use-app-selector';

const EMPTY_BOARD = groupBoardCards([]);

type LocationBoardReduxWidgetProps = {
	locationId: string;
	/** Shows only the copies this collection keeps here; every copy when null. */
	collectionId: string | null;
	onViewCard: (card: DeckCardEntry, group: DeckCardGroup) => void;
	/** Opens the collection the card's copies come from. */
	onOpenCollection: (collectionId: string) => void;
};

/** Which collection each printing's copies here come from, as chips. */
function sourceChips(location: GroupedLocation): Record<string, BoardChip[]> {
	const chips: Record<string, BoardChip[]> = {};
	for (const entry of Object.entries(location.sources))
		chips[entry[0]] = Object.entries(entry[1])
			.sort((a, b) => b[1] - a[1])
			.map((source) => ({ label: `${location.collections[source[0]] ?? 'Collection'} ×${source[1]}`, tone: 'neutral' }));
	return chips;
}

/** The collection keeping the most copies of a card's printings here. */
function mainSource(location: GroupedLocation, group: DeckCardGroup): string | null {
	const totals: Record<string, number> = {};
	for (const card of group.printings)
		for (const entry of Object.entries(location.sources[card.uuid] ?? {})) totals[entry[0]] = (totals[entry[0]] ?? 0) + entry[1];
	return Object.keys(totals).sort((a, b) => totals[b] - totals[a])[0] ?? null;
}

/**
 * Every copy kept in a storage location, drawn by the deck list's board pair. Editing a card
 * opens the collection it comes from; removing it here leaves the copies in their collections, unplaced.
 */
export function LocationBoardReduxWidget(props: LocationBoardReduxWidgetProps) {
	const { locationId, collectionId, onViewCard, onOpenCollection } = props;
	const dispatch = useAppDispatch();
	const isPhoneLayout = useIsPhoneLayout();
	const HoverPreview = useCardHoverPreview();
	const location = useAppSelector((root) => selectLocation(root, locationId));
	const cards = useMemo(
		() => (location ? { main: groupBoardCards(locationCardsFrom(location, collectionId)), side: EMPTY_BOARD } : null),
		[location, collectionId]
	);
	const annotations = useMemo<BoardAnnotations | undefined>(
		() => (location ? { printingChips: sourceChips(location) } : undefined),
		[location]
	);
	const sections = useMemo<BoardSection[]>(
		() => [{ board: 'main', label: collectionId ? (location?.collections[collectionId] ?? 'Collection') : 'Kept here', empty: 'Nothing is kept here yet. Place copies from a collection.' }],
		[collectionId, location]
	);
	const onCardEvent = useCallback(
		(event: BoardCardEvent) => {
			if (!location) return;
			if (event.type === 'view') {
				onViewCard(event.card, event.group);
				return;
			}
			if (event.type === 'edit' || event.type === 'move') {
				const source = mainSource(location, event.group);
				if (source) onOpenCollection(source);
				return;
			}
			// Unplaces the copies kept here, collection by collection.
			const moves: Record<string, Array<{ uuid: string; from: string; to: null; count: number }>> = {};
			for (const card of event.group.printings)
				for (const entry of Object.entries(location.sources[card.uuid] ?? {}))
					if (collectionId === null || entry[0] === collectionId) (moves[entry[0]] ||= []).push({ uuid: card.uuid, from: locationId, to: null, count: entry[1] });
			for (const entry of Object.entries(moves)) void dispatch(placeCollectionCards(entry[0], entry[1]));
		},
		[collectionId, dispatch, location, locationId, onOpenCollection, onViewCard]
	);
	if (!location || !cards) return null;
	return isPhoneLayout ? (
		<MobileDecklistBoard
			cards={cards}
			busyGroup={null}
			onCardEvent={onCardEvent}
			annotations={annotations}
			sections={sections}
			moveLabel="Open its collection"
			deleteLabel="Remove from this location"
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
