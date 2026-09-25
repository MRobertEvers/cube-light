import React, { useEffect, useRef, useState } from 'react';
import { Button } from 'src/ui/kit/components/Button/Button';
import { Counter } from 'src/ui/kit/components/Counter/Counter';
import { LocationSelect } from 'src/ui/kit/components/LocationSelect/LocationSelect';
import { SmallInputModal } from 'src/ui/kit/components/SmallInputModal/SmallInputModal';
import { Spinner } from 'src/ui/kit/components/Spinner/Spinner';
import { SuggestionInput } from 'src/ui/kit/components/SuggestionInput/SuggestionInput';
import type { StorageLocationSummaries } from 'src/domain/models/library';
import { searchCardNames } from 'src/redux/card-name-lookup/card-name-lookup.thunks';
import { addCardToCollection } from 'src/redux/library/library.thunks';
import { errorMessage } from 'src/redux/thunk';
import { useAppDispatch } from 'src/redux/use-app-dispatch';

import styles from './collection-dialogs.module.css';

type AddToCollectionDialogProps = {
	collectionId: string;
	collectionName: string;
	locations: StorageLocationSummaries;
	/** Where new copies go unless another location is chosen. */
	initialLocationId: string | null;
	onClose: () => void;
};

/** Adds copies of one card to a collection, optionally filing them in a storage location. */
export function AddToCollectionDialog(props: AddToCollectionDialogProps) {
	const { collectionId, collectionName, locations, initialLocationId, onClose } = props;
	const dispatch = useAppDispatch();
	const [text, setText] = useState('');
	const [suggestions, setSuggestions] = useState<string[]>([]);
	const [open, setOpen] = useState(false);
	const [searching, setSearching] = useState(false);
	const [count, setCount] = useState(1);
	const [locationId, setLocationId] = useState<string | null>(initialLocationId);
	const [keepAdding, setKeepAdding] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [status, setStatus] = useState<string | null>(null);
	const input = useRef<HTMLInputElement>(null);
	const latest = useRef('');

	useEffect(() => {
		// Loads the name index before the first keystroke.
		void dispatch(searchCardNames('')).unwrap().catch(() => undefined);
		input.current?.focus();
	}, [dispatch]);

	function search(query: string) {
		latest.current = query;
		setText(query);
		setError(null);
		setStatus(null);
		if (!query.trim()) {
			setSuggestions([]);
			setOpen(false);
			setSearching(false);
			return;
		}
		setSearching(true);
		dispatch(searchCardNames(query))
			.unwrap()
			.then(
				(names) => {
					if (latest.current !== query) return;
					setSuggestions(names);
					setOpen(names.length > 0);
					setSearching(false);
				},
				() => {
					if (latest.current !== query) return;
					setSearching(false);
					setError('Unable to search cards. Please try again.');
				}
			);
	}

	const exact = suggestions.find((name) => name.toLowerCase() === text.trim().toLowerCase());
	const resolved = !searching && (exact || suggestions.length === 1) ? (exact ?? suggestions[0]) : null;
	const canAdd = !!resolved && count > 0 && !saving;

	async function add() {
		if (!resolved || !canAdd) return;
		setSaving(true);
		setError(null);
		try {
			await dispatch(addCardToCollection(collectionId, resolved, count, locationId));
			if (!keepAdding) {
				onClose();
				return;
			}
			setStatus(`${count} ${resolved} added.`);
			latest.current = '';
			setText('');
			setSuggestions([]);
			setCount(1);
			setSaving(false);
			input.current?.focus();
		} catch (addError) {
			setError(errorMessage(addError, 'Unable to add this card. Please try again.'));
			setSaving(false);
		}
	}

	return (
		<SmallInputModal
			title={`Add to ${collectionName}`}
			onClose={onClose}
			closeDisabled={saving}
			closeOnEscape={!open}
			onSubmit={() => void add()}
			busy={saving}
			actions={
				<>
					<Button onClick={onClose} disabled={saving}>
						Done
					</Button>
					<Button type="submit" variant="primary" disabled={!canAdd}>
						{saving ? (
							<>
								<Spinner /> Adding…
							</>
						) : (
							'Add card'
						)}
					</Button>
				</>
			}
		>
			<div className={styles.field}>
				<label htmlFor="collection-add-name">Card name</label>
				<SuggestionInput
					id="collection-add-name"
					inputRef={input}
					value={text}
					suggestions={suggestions}
					open={open}
					onOpenChange={setOpen}
					onChange={search}
					onSelect={(name) => {
						latest.current = name;
						setText(name);
						setSuggestions([name]);
						setOpen(false);
						setSearching(false);
					}}
					enterSelects={suggestions.length === 1 && !exact ? suggestions[0] : undefined}
					tabSelects={suggestions.length === 1 ? suggestions[0] : undefined}
					placeholder="Start typing a card name"
					disabled={saving}
					indicator={searching ? <Spinner /> : null}
					listLabel="Card suggestions"
				/>
			</div>
			<div className={styles.row}>
				<span className={styles.rowLabel}>Copies</span>
				<Counter count={count} min={1} label="Copies" setCount={(next) => setCount(Math.max(1, Math.min(999, next)))} />
			</div>
			<div className={styles.field}>
				<label htmlFor="collection-add-location">Storage location</label>
				<LocationSelect id="collection-add-location" locations={locations} value={locationId} onChange={setLocationId} disabled={saving} />
			</div>
			<label className={styles.check}>
				<input type="checkbox" checked={keepAdding} disabled={saving} onChange={(event) => setKeepAdding(event.target.checked)} />
				Keep adding cards
			</label>
			{status && (
				<p className={styles.status} role="status">
					{status}
				</p>
			)}
			{error && (
				<p className={styles.error} role="alert">
					{error}
				</p>
			)}
		</SmallInputModal>
	);
}
