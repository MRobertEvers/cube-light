import React, { useMemo, useState } from 'react';
import { HeaderBackButton } from 'src/ui/kit/components/BackLink/BackLink';
import { HeaderBackSlot } from 'src/ui/kit/components/Header/HeaderBackSlot';
import { TagInput } from 'src/ui/kit/components/TagInput/TagInput';
import { useCloseOnEscape } from 'src/ui/kit/hooks/useCloseOnEscape';
import type { DeckGroup, DeckSummary } from '../../../../domain/models/deck';
import { deckTagCounts, knownDeckTags } from '../../../../domain/deck/deck-groups';
import {
	deckInGroup,
	MAX_GROUP_NAME_LENGTH,
	normalizeTags,
	tagKey
} from '../../../../domain/deck/tags';

import styles from './deck-group-dialog.module.css';

export type DeckGroupDraft = Pick<DeckGroup, 'name' | 'tags' | 'match'>;

type DeckGroupDialogProps = {
	/** The group being edited; null to create one. */
	group: DeckGroup | null;
	decks: DeckSummary[];
	saving: boolean;
	error: string | null;
	onSave: (draft: DeckGroupDraft) => void;
	onDelete?: () => void;
	onClose: () => void;
};

/** Creates or edits a deck group: its name, its tags, and whether decks need any or all of them. */
export function DeckGroupDialog(props: DeckGroupDialogProps) {
	const { group, decks, saving, error, onSave, onDelete, onClose } = props;
	const [name, setName] = useState(group?.name ?? '');
	const [tags, setTags] = useState<string[]>(group?.tags ?? []);
	const [match, setMatch] = useState<DeckGroup['match']>(group?.match ?? 'any');
	useCloseOnEscape(onClose, !saving);

	const known = useMemo(() => knownDeckTags(decks), [decks]);
	const counts = useMemo(() => deckTagCounts(decks), [decks]);
	const chosen = new Set(tags.map(tagKey));
	const unchosen = known.filter((tag) => !chosen.has(tagKey(tag)));
	const matching = decks.filter((deck) => deckInGroup(deck.tags, { tags, match }));
	const canSave = !!name.trim() && tags.length > 0 && !saving;
	const title = group ? 'Edit group' : 'New group';

	function save() {
		if (canSave) onSave({ name: name.trim(), tags: normalizeTags(tags), match });
	}

	return (
		<section
			className={styles['dialog']}
			role="dialog"
			aria-modal="true"
			aria-labelledby="deck-group-title"
		>
			<header className={styles['top-bar']}>
				<HeaderBackSlot>
					{/* Phones fill the screen and close from here, so Cancel hides. */}
					<HeaderBackButton
						inline
						label={`Close ${title.toLowerCase()}`}
						onClick={() => {
							if (!saving) onClose();
						}}
					/>
				</HeaderBackSlot>
				<h2 id="deck-group-title">{title}</h2>
				<div className={styles['actions']}>
					{onDelete && (
						<button
							type="button"
							className={styles['delete']}
							disabled={saving}
							onClick={onDelete}
						>
							Delete
						</button>
					)}
					<button
						type="button"
						className={`${styles['secondary']} ${styles['cancel']}`}
						disabled={saving}
						onClick={onClose}
					>
						Cancel
					</button>
					<button
						type="button"
						className={styles['primary']}
						disabled={!canSave}
						onClick={save}
					>
						{saving ? 'Saving…' : 'Save'}
					</button>
				</div>
			</header>
			<div className={styles['body']}>
				{error && (
					<p className={styles['error']} role="alert">
						{error}
					</p>
				)}
				<div className={styles['field']}>
					<label htmlFor="deck-group-name">Group name</label>
					<input
						id="deck-group-name"
						autoFocus={!group}
						value={name}
						maxLength={MAX_GROUP_NAME_LENGTH}
						disabled={saving}
						placeholder="e.g. Cubes"
						onChange={(event) => setName(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter') save();
						}}
					/>
				</div>
				<div className={styles['field']}>
					<label htmlFor="deck-group-tags">Tags</label>
					<TagInput
						id="deck-group-tags"
						tags={tags}
						suggestions={known}
						disabled={saving}
						placeholder="Type a tag"
						onChange={setTags}
						onSubmit={save}
					/>
					{unchosen.length > 0 && (
						<div className={styles['known-tags']}>
							<span id="deck-group-known">Tags on your decks</span>
							<ul aria-labelledby="deck-group-known">
								{unchosen.map((tag) => (
									<li key={tagKey(tag)}>
										<button
											type="button"
											disabled={saving}
											aria-label={`Add tag ${tag}`}
											onClick={() =>
												setTags(normalizeTags(tags.concat([tag])))
											}
										>
											{tag}
											<small>{counts.get(tagKey(tag)) ?? 0}</small>
										</button>
									</li>
								))}
							</ul>
						</div>
					)}
					{known.length === 0 && (
						<p className={styles['hint']}>
							No deck has tags yet. Add them from a deck’s “Name and
							tags” menu item, or type the tags this group should
							collect.
						</p>
					)}
				</div>
				<fieldset className={styles['match']} disabled={saving}>
					<legend>Show decks with</legend>
					<label>
						<input
							type="radio"
							name="deck-group-match"
							checked={match === 'any'}
							onChange={() => setMatch('any')}
						/>
						<span>Any of these tags</span>
					</label>
					<label>
						<input
							type="radio"
							name="deck-group-match"
							checked={match === 'all'}
							onChange={() => setMatch('all')}
						/>
						<span>All of these tags</span>
					</label>
				</fieldset>
				<div className={styles['preview']} aria-live="polite">
					<strong>
						{tags.length === 0
							? 'Choose tags to see which decks match.'
							: `${matching.length} ${matching.length === 1 ? 'deck matches' : 'decks match'}`}
					</strong>
					{matching.length > 0 && (
						<ul>
							{matching.map((deck) => (
								<li key={deck.deckId}>{deck.name}</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</section>
	);
}
