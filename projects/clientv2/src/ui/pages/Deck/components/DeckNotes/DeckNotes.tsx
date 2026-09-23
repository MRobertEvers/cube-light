import React, { useState } from 'react';
import type { DeckNote } from '../../../../../domain/models/deck';
import { useAppDispatch } from '../../../../../redux/use-app-dispatch';
import { addDeckNote, editDeckNote, removeDeckNote } from '../../../../../redux/decks/decks.thunks';
import { Button } from '../../../../kit/components/Button/Button';

import styles from './deck-notes.module.css';

type DeckNotesProps = {
	deckId: string;
	notes: DeckNote[];
};

const dateFormat = new Intl.DateTimeFormat(undefined, {
	dateStyle: 'medium',
	timeStyle: 'short'
});

export function DeckNotes(props: DeckNotesProps) {
	const { deckId, notes } = props;
	const dispatch = useAppDispatch();
	const [draft, setDraft] = useState('');
	// The note being edited and its unsaved text.
	const [editing, setEditing] = useState<{
		noteId: string;
		text: string;
	} | null>(null);
	// 'new' or a note ID while that save or delete is in flight.
	const [busy, setBusy] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function run(key: string, work: () => Promise<unknown>, failure: string) {
		if (busy) return false;
		setBusy(key);
		setError(null);
		try {
			await work();
			return true;
		} catch {
			setError(failure);
			return false;
		} finally {
			setBusy(null);
		}
	}

	async function create() {
		const text = draft;
		if (!text.trim()) return;
		if (
			await run(
				'new',
				() => dispatch(addDeckNote(deckId, text)),
				'Unable to save the note. Please try again.'
			)
		)
			setDraft('');
	}

	async function saveEdit() {
		if (!editing?.text.trim()) return;
		const { noteId, text } = editing;
		if (
			await run(
				noteId,
				() => dispatch(editDeckNote(deckId, noteId, text)),
				'Unable to save the note. Please try again.'
			)
		)
			setEditing(null);
	}

	function remove(note: DeckNote) {
		if (!window.confirm('Delete this note?')) return;
		void run(
			note.noteId,
			() => dispatch(removeDeckNote(deckId, note.noteId)),
			'Unable to delete the note. Please try again.'
		);
	}

	return (
		<section className={styles.notes} aria-labelledby="deck-notes-title">
			<h2 id="deck-notes-title" className={styles.title}>
				Notes
			</h2>
			<form
				className={styles.composer}
				onSubmit={(event) => {
					event.preventDefault();
					void create();
				}}
			>
				<label htmlFor="new-deck-note" className={styles.srOnly}>
					New note
				</label>
				<textarea
					id="new-deck-note"
					value={draft}
					placeholder="Write a note about this deck…"
					rows={3}
					maxLength={20000}
					disabled={busy === 'new'}
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === 'Enter' && (event.metaKey || event.ctrlKey))
							void create();
					}}
				/>
				<div className={styles.actions}>
					<Button type="submit" disabled={!draft.trim() || !!busy}>
						{busy === 'new' ? 'Saving…' : 'Add note'}
					</Button>
				</div>
			</form>
			{error && (
				<p className={styles.error} role="alert">
					{error}
				</p>
			)}
			{notes.length === 0 ? (
				<p className={styles.empty}>No notes yet.</p>
			) : (
				<ul className={styles.list}>
					{notes.map((note) => (
						<li key={note.noteId} className={styles.note}>
							{editing?.noteId === note.noteId ? (
								<form
									onSubmit={(event) => {
										event.preventDefault();
										void saveEdit();
									}}
								>
									<label
										htmlFor={`edit-${note.noteId}`}
										className={styles.srOnly}
									>
										Edit note
									</label>
									<textarea
										id={`edit-${note.noteId}`}
										autoFocus
										value={editing.text}
										rows={Math.min(12, editing.text.split('\n').length + 1)}
										maxLength={20000}
										disabled={busy === note.noteId}
										onChange={(event) =>
											setEditing({
												noteId: note.noteId,
												text: event.target.value
											})
										}
										onKeyDown={(event) => {
											if (event.key === 'Escape') setEditing(null);
											if (
												event.key === 'Enter' &&
												(event.metaKey || event.ctrlKey)
											)
												void saveEdit();
										}}
									/>
									<div className={styles.actions}>
										<Button
											onClick={() => setEditing(null)}
											disabled={busy === note.noteId}
										>
											Cancel
										</Button>
										<Button
											type="submit"
											disabled={!editing.text.trim() || !!busy}
										>
											{busy === note.noteId ? 'Saving…' : 'Save'}
										</Button>
									</div>
								</form>
							) : (
								<>
									<p className={styles.text}>{note.text}</p>
									<div className={styles.meta}>
										<time dateTime={note.updatedAt}>
											{note.updatedAt === note.createdAt
												? ''
												: 'Edited '}
											{dateFormat.format(new Date(note.updatedAt))}
										</time>
										<div className={styles.noteActions}>
											<Button
												onClick={() =>
													setEditing({
														noteId: note.noteId,
														text: note.text
													})
												}
												disabled={!!busy}
											>
												Edit
											</Button>
											<Button
												className={styles.delete}
												onClick={() => remove(note)}
												disabled={!!busy}
											>
												{busy === note.noteId ? 'Deleting…' : 'Delete'}
											</Button>
										</div>
									</div>
								</>
							)}
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
