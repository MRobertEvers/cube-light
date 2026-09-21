import React, { useEffect, useId, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Button } from 'src/components/Button/Button';
import { Spinner } from 'src/components/Spinner/Spinner';
import {
	closeAddCards,
	importDeckCards,
	selectAddCards,
	setAddCardsText
} from 'src/store/add-cards/add-cards.state';
import { useAppDispatch } from 'src/store/use-app-dispatch';
import { parseCardList } from 'src/utils/parse-card-list';
import adderStyles from '../AddCard/card-adder.module.css';
import styles from './add-cards.module.css';

const PLACEHOLDER = `4 Lightning Bolt
2x Counterspell (MH2) 267
Sol Ring
Fire // Ice`;

export function AddCards() {
	const dispatch = useAppDispatch();
	const {
		deckId,
		text,
		submitting: isSubmitting,
		error,
		unknownCards
	} = useSelector(selectAddCards);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const summaryId = useId();
	const errorId = useId();

	const parsed = useMemo(() => parseCardList(text), [text]);
	const total = parsed.cards.reduce((sum, card) => sum + card.count, 0);
	const unknownLines = parsed.cards.filter((card) =>
		unknownCards.includes(card.name.toLowerCase())
	);
	const issues = [
		...parsed.errors.map(({ line, message }) => ({
			line,
			message,
			skipped: false
		})),
		...unknownLines.flatMap((card) =>
			card.lines.map((line) => ({
				line,
				message: `Unknown card: ${card.name}`,
				skipped: false
			}))
		),
		...parsed.skipped.map(({ line, message }) => ({
			line,
			message,
			skipped: true
		}))
	].sort((a, b) => a.line - b.line);
	const hasBlockingIssues = issues.some((issue) => !issue.skipped);
	const canSubmit =
		!!deckId &&
		parsed.cards.length > 0 &&
		!hasBlockingIssues &&
		!isSubmitting;

	useEffect(() => {
		const previousFocus = document.activeElement as HTMLElement | null;
		textareaRef.current?.focus();
		return () => previousFocus?.focus();
	}, []);

	const onClose = () => dispatch(closeAddCards());

	function submit() {
		if (!canSubmit) {
			textareaRef.current?.focus();
			return;
		}
		void dispatch(
			importDeckCards({
				deckId,
				cards: parsed.cards.map(({ name, count, setCode }) => ({
					name,
					count,
					setCode
				}))
			})
		);
	}

	return (
		<form
			className={`${adderStyles['dialog']} ${styles['dialog']}`}
			role="dialog"
			aria-modal="true"
			aria-busy={isSubmitting}
			aria-labelledby="add-cards-title"
			onSubmit={(event) => {
				event.preventDefault();
				submit();
			}}
			onKeyDown={(event) => {
				if (event.key === 'Escape' && !isSubmitting) {
					event.preventDefault();
					onClose();
				} else if (
					event.key === 'Enter' &&
					(event.metaKey || event.ctrlKey)
				) {
					event.preventDefault();
					submit();
				}
			}}
		>
			<div className={adderStyles['heading']}>
				<h2 id="add-cards-title">Add cards</h2>
				<p>
					Paste a list with one card per line, like an Arena or MTGO
					export. Counts and set codes are optional.
				</p>
			</div>
			<div className={adderStyles['field']}>
				<label htmlFor="add-cards-list">Card list</label>
				<textarea
					id="add-cards-list"
					ref={textareaRef}
					className={styles['list-input']}
					value={text}
					placeholder={PLACEHOLDER}
					spellCheck={false}
					autoComplete="off"
					disabled={isSubmitting}
					aria-describedby={`${summaryId}${error ? ` ${errorId}` : ''}`}
					aria-invalid={hasBlockingIssues}
					onChange={(event) => {
						dispatch(setAddCardsText(event.target.value));
					}}
				/>
				<p
					id={summaryId}
					className={adderStyles['field-hint']}
					aria-live="polite"
				>
					{parsed.cards.length === 0
						? 'Press Ctrl+Enter or ⌘+Enter to add.'
						: `${total} ${total === 1 ? 'card' : 'cards'} (${parsed.cards.length} unique) ready to add.`}
				</p>
				{issues.length > 0 && (
					<ul
						className={styles['issues']}
						aria-label="Lines needing attention"
					>
						{issues.map((issue) => (
							<li
								key={`${issue.line}-${issue.message}`}
								className={
									issue.skipped
										? styles['skipped']
										: undefined
								}
							>
								<span className={styles['line-number']}>
									Line {issue.line}
								</span>{' '}
								{issue.message}
							</li>
						))}
					</ul>
				)}
				{error && (
					<p
						id={errorId}
						className={adderStyles['error']}
						role="alert"
					>
						{error}
					</p>
				)}
			</div>
			<div
				className={`${adderStyles['modal-buttons']} ${styles['buttons']}`}
			>
				<Button
					className={adderStyles['cancel-button']}
					disabled={isSubmitting}
					onClick={onClose}
				>
					Cancel
				</Button>
				<Button
					className={adderStyles['add-button']}
					type="submit"
					disabled={!canSubmit}
				>
					{isSubmitting ? (
						<>
							<Spinner /> Adding…
						</>
					) : total > 0 ? (
						`Add ${total} ${total === 1 ? 'card' : 'cards'}`
					) : (
						'Add cards'
					)}
				</Button>
			</div>
		</form>
	);
}
