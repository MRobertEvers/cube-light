import React, { useId, useState } from 'react';
import {
	MAX_DECK_TAGS,
	MAX_TAG_LENGTH,
	normalizeTag,
	normalizeTags,
	tagKey
} from '../../../../domain/deck/tags';

import styles from './tag-input.module.css';

type TagInputProps = {
	/** The text field's id, for an outside `<label htmlFor>`. */
	id: string;
	tags: string[];
	onChange: (tags: string[]) => void;
	/** Tags to offer while typing; ones already chosen are left out. */
	suggestions?: string[];
	disabled?: boolean;
	placeholder?: string;
	/** Commits the typed tag and asks the owner to submit, e.g. to save on Enter in an empty field. */
	onSubmit?: () => void;
};

/**
 * A list of tags as removable chips, plus a field that adds one tag per Enter or comma.
 * Typing a tag already chosen (in any case) adds nothing; Backspace in the empty field
 * removes the last tag. Suggestions come from a native datalist, so they work on phones.
 */
export function TagInput(props: TagInputProps) {
	const { id, tags, onChange, suggestions = [], disabled, placeholder, onSubmit } = props;
	const [text, setText] = useState('');
	const listId = useId();
	const chosen = new Set(tags.map(tagKey));
	const offered = suggestions.filter((tag) => !chosen.has(tagKey(tag)));
	const full = tags.length >= MAX_DECK_TAGS;

	/** Adds the typed text as tags, splitting on commas. Returns the tags now chosen. */
	function commit(value: string): string[] {
		const typed = value.split(',').map(normalizeTag).filter(Boolean);
		setText('');
		if (!typed.length) return tags;
		const next = normalizeTags(tags.concat(typed)).slice(0, MAX_DECK_TAGS);
		if (next.length !== tags.length) onChange(next);
		return next;
	}

	function remove(index: number) {
		onChange(tags.filter((_, position) => position !== index));
	}

	return (
		<div className={styles['tag-input']} aria-disabled={disabled}>
			{tags.length > 0 && (
				<ul className={styles['chips']} aria-label="Chosen tags">
					{tags.map((tag, index) => (
						<li key={tagKey(tag)} className={styles['chip']}>
							<span>{tag}</span>
							<button
								type="button"
								aria-label={`Remove tag ${tag}`}
								disabled={disabled}
								onClick={() => remove(index)}
							>
								<svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
									<path
										d="M2.5 2.5l7 7M9.5 2.5l-7 7"
										stroke="currentColor"
										strokeWidth="1.6"
										strokeLinecap="round"
									/>
								</svg>
							</button>
						</li>
					))}
				</ul>
			)}
			<input
				id={id}
				className={styles['field']}
				list={listId}
				value={text}
				disabled={disabled || full}
				maxLength={MAX_TAG_LENGTH}
				placeholder={
					full ? `Up to ${MAX_DECK_TAGS} tags` : (placeholder ?? 'Add a tag')
				}
				autoComplete="off"
				enterKeyHint="done"
				onChange={(event) => {
					const value = event.target.value;
					// Picking a suggestion replaces the text in one step; add it straight away.
					const native = event.nativeEvent as InputEvent;
					if (
						native.inputType === 'insertReplacementText' ||
						(native.inputType === undefined &&
							offered.some((tag) => tag === value))
					)
						commit(value);
					else if (value.includes(',')) commit(value);
					else setText(value);
				}}
				onKeyDown={(event) => {
					if (event.key === 'Enter') {
						event.preventDefault();
						if (text.trim()) commit(text);
						else onSubmit?.();
					} else if (event.key === 'Backspace' && !text && tags.length)
						remove(tags.length - 1);
				}}
				onBlur={() => commit(text)}
			/>
			<datalist id={listId}>
				{offered.map((tag) => (
					<option key={tagKey(tag)} value={tag} />
				))}
			</datalist>
		</div>
	);
}
