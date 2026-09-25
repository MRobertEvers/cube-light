import React, { useState } from 'react';
import { HeaderBackButton } from 'src/ui/kit/components/BackLink/BackLink';
import { HeaderBackSlot } from 'src/ui/kit/components/Header/HeaderBackSlot';
import { Counter } from 'src/ui/kit/components/Counter/Counter';
import { Spinner } from 'src/ui/kit/components/Spinner/Spinner';
import { useCloseOnEscape } from 'src/ui/kit/hooks/useCloseOnEscape';
import { MAX_COPIES } from 'src/domain/deck/card-steps';
import { placementMoves } from 'src/domain/library/placements';
import type { DeckCardEntry } from 'src/domain/models/deck';
import type { Placements, StorageLocationSummaries } from 'src/domain/models/library';
import { editCollectionCards, placeCollectionCards } from 'src/redux/library/library.thunks';
import { useAppDispatch } from 'src/redux/use-app-dispatch';

import styles from './collection-card-dialog.module.css';

type Draft = Record<string, { count: number; placed: Record<string, number> }>;

type CollectionCardDialogProps = {
	collectionId: string;
	cardName: string;
	/** The collection's printings of the card, as it opened. */
	printings: DeckCardEntry[];
	stored: Placements;
	locations: StorageLocationSummaries;
	onClose: () => void;
};

function draftOf(printings: DeckCardEntry[], stored: Placements, locations: StorageLocationSummaries): Draft {
	const draft: Draft = {};
	for (const card of printings) {
		const placed: Record<string, number> = {};
		for (const location of locations) placed[location.locationId] = stored[card.uuid]?.[location.locationId] ?? 0;
		draft[card.uuid] = { count: card.count, placed };
	}
	return draft;
}

function placedTotal(placed: Record<string, number>): number {
	return Object.values(placed).reduce((total, count) => total + count, 0);
}

/**
 * Edits how many copies of each printing of a card the collection holds, and which
 * storage location keeps them. Copies not given a location stay unplaced.
 */
export function CollectionCardDialog(props: CollectionCardDialogProps) {
	const { collectionId, cardName, printings, stored, locations, onClose } = props;
	const dispatch = useAppDispatch();
	const [draft, setDraft] = useState<Draft>(() => draftOf(printings, stored, locations));
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

	/**
	 * Saves added copies, then placements, then removed copies, so no step ever
	 * places more copies than the collection holds at that moment.
	 */
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

	return (
		<section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="collection-card-title">
			<header className={styles.topBar}>
				<HeaderBackSlot>
					<HeaderBackButton inline label={`Close ${cardName}`} onClick={() => !saving && onClose()} />
				</HeaderBackSlot>
				<h2 id="collection-card-title">{cardName}</h2>
				<div className={styles.actions}>
					<button type="button" className={styles.secondary} disabled={saving} onClick={onClose}>
						Cancel
					</button>
					<button type="button" className={styles.primary} disabled={saving} onClick={() => void save()}>
						{saving ? (
							<>
								<Spinner /> Saving…
							</>
						) : (
							'Save'
						)}
					</button>
				</div>
			</header>
			<div className={styles.body}>
				{error && (
					<p className={styles.error} role="alert">
						{error}
					</p>
				)}
				{printings.map((card) => {
					const entry = draft[card.uuid];
					const unplaced = entry.count - placedTotal(entry.placed);
					const label = `${cardName} (${card.setCode})`;
					return (
						<section key={card.uuid} className={styles.printing} aria-label={label}>
							<div className={styles.printingHead}>
								<img src={card.images?.small ?? card.image} alt="" loading="lazy" />
								<div className={styles.printingText}>
									<strong>{card.setCode}</strong>
									<span>{entry.count === 0 ? 'Removed on save' : `${entry.count} ${entry.count === 1 ? 'copy' : 'copies'}`}</span>
								</div>
								<Counter count={entry.count} min={0} label={`${label} copies`} setCount={(count) => setCount(card.uuid, count)} />
							</div>
							{locations.length > 0 && entry.count > 0 && (
								<div className={styles.place}>
									<h3>Place</h3>
									{locations.map((location) => (
										<div key={location.locationId} className={styles.placeRow}>
											<span>{location.name}</span>
											<Counter
												count={entry.placed[location.locationId]}
												min={0}
												label={`${label} copies in ${location.name}`}
												setCount={(count) => setPlaced(card.uuid, location.locationId, count)}
											/>
										</div>
									))}
									<div className={`${styles.placeRow} ${styles.remainder}`}>
										<span>Unplaced</span>
										<span>{unplaced}</span>
									</div>
								</div>
							)}
						</section>
					);
				})}
				{locations.length === 0 && <p className={styles.hint}>Add storage locations in the Library to record where these copies are kept.</p>}
			</div>
		</section>
	);
}
