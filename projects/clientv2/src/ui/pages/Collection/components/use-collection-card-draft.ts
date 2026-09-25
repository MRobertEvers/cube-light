import { useState } from 'react';
import { MAX_COPIES } from 'src/domain/deck/card-steps';
import { placementMoves } from 'src/domain/library/placements';
import type { DeckCardEntry } from 'src/domain/models/deck';
import type { Placements, StorageLocationSummaries } from 'src/domain/models/library';
import { editCollectionCards, placeCollectionCards } from 'src/redux/library/library.thunks';
import { useAppDispatch } from 'src/redux/use-app-dispatch';
import { useCloseOnEscape } from 'src/ui/kit/hooks/useCloseOnEscape';

export type CollectionCardDialogProps = {
	collectionId: string;
	cardName: string;
	/** The collection's printings of the card, as it opened. */
	printings: DeckCardEntry[];
	stored: Placements;
	locations: StorageLocationSummaries;
	onClose: () => void;
};

export type CollectionCardDraft = Record<string, { count: number; placed: Record<string, number> }>;

function draftOf(printings: DeckCardEntry[], stored: Placements, locations: StorageLocationSummaries): CollectionCardDraft {
	const draft: CollectionCardDraft = {};
	for (const card of printings) {
		const placed: Record<string, number> = {};
		for (const location of locations) placed[location.locationId] = stored[card.uuid]?.[location.locationId] ?? 0;
		draft[card.uuid] = { count: card.count, placed };
	}
	return draft;
}

export function placedTotal(placed: Record<string, number>): number {
	return Object.values(placed).reduce((total, count) => total + count, 0);
}

/** The collection card dialog's draft and save, whichever way it shows the printings. */
export type CollectionCardDraftState = {
	draft: CollectionCardDraft;
	saving: boolean;
	error: string | null;
	setCount: (uuid: string, count: number) => void;
	setPlaced: (uuid: string, locationId: string, count: number) => void;
	save: () => Promise<void>;
};

/**
 * Copies and placements of each printing as edited, saved together: added copies,
 * then placements, then removed copies, so no step ever places more copies than
 * the collection holds at that moment.
 */
export function useCollectionCardDraft(props: CollectionCardDialogProps): CollectionCardDraftState {
	const { collectionId, printings, stored, locations, onClose } = props;
	const dispatch = useAppDispatch();
	const [draft, setDraft] = useState<CollectionCardDraft>(() => draftOf(printings, stored, locations));
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	useCloseOnEscape(onClose, !saving);

	function setCount(uuid: string, count: number) {
		setDraft((current) => {
			const next = structuredClone(current);
			next[uuid].count = Math.max(0, Math.min(MAX_COPIES, count));
			// Fewer copies than are placed take the surplus from the fullest location.
			let surplus = placedTotal(next[uuid].placed) - next[uuid].count;
			for (const locationId of Object.keys(next[uuid].placed).sort((a, b) => next[uuid].placed[b] - next[uuid].placed[a])) {
				if (surplus <= 0) break;
				const taken = Math.min(surplus, next[uuid].placed[locationId]);
				next[uuid].placed[locationId] -= taken;
				surplus -= taken;
			}
			return next;
		});
	}

	function setPlaced(uuid: string, locationId: string, count: number) {
		setDraft((current) => {
			const next = structuredClone(current);
			const others = placedTotal(next[uuid].placed) - next[uuid].placed[locationId];
			next[uuid].placed[locationId] = Math.max(0, Math.min(next[uuid].count - others, count));
			return next;
		});
	}

	async function save() {
		if (saving) return;
		setSaving(true);
		setError(null);
		try {
			const added = printings.filter((card) => draft[card.uuid].count > card.count);
			const removed = printings.filter((card) => draft[card.uuid].count < card.count);
			if (added.length)
				await dispatch(editCollectionCards(collectionId, added.map((card) => ({ type: 'adjust', uuid: card.uuid, board: 'main', delta: draft[card.uuid].count - card.count }))));
			const moves = printings.flatMap((card) => {
				const before: Record<string, number> = {};
				for (const location of locations) before[location.locationId] = stored[card.uuid]?.[location.locationId] ?? 0;
				return placementMoves(card.uuid, before, draft[card.uuid].placed);
			});
			if (moves.length) await dispatch(placeCollectionCards(collectionId, moves));
			if (removed.length)
				await dispatch(editCollectionCards(collectionId, removed.map((card) => ({ type: 'adjust', uuid: card.uuid, board: 'main', delta: draft[card.uuid].count - card.count }))));
			onClose();
		} catch {
			setError('Unable to save these copies. Please try again.');
			setSaving(false);
		}
	}

	return { draft, saving, error, setCount, setPlaced, save };
}
