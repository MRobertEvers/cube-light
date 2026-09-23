import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from 'src/ui/kit/components/Button/Button';
import { Spinner } from 'src/ui/kit/components/Spinner/Spinner';
import { HeaderBackButton } from 'src/ui/kit/components/BackLink/BackLink';
import { HeaderBackSlot } from 'src/ui/kit/components/Header/HeaderBackSlot';
import { useCardListLint } from 'src/ui/kit/hooks/useCardListLint';
import { closeAddCards, setAddCardsBoard, setAddCardsText } from 'src/redux/add-cards/addCardsSlice';
import { importDeckCards } from 'src/redux/add-cards/add-cards.thunks';
import { selectAddCards } from 'src/redux/add-cards/add-cards.selectors';
import { DECK_BOARD_LABELS, DECK_BOARD_ORDER } from 'src/domain/deck/boards';
import { useAppDispatch } from 'src/redux/use-app-dispatch';
import { useAppSelector } from 'src/redux/use-app-selector';
import {
	CardListNote,
	locateCardName,
	parseCardList
} from 'src/domain/card-names/parse-card-list';
import type { CardListProblem } from 'src/domain/card-names/card-list-problem';
import adderStyles from '../AddCard/card-adder.module.css';
import styles from './add-cards.module.css';
import { CardListEditor, mergeLines, replaceInLine } from './CardListEditor';

const PLACEHOLDER = `4 Lightning Bolt
2x Counterspell (MH2) 267
Sol Ring
Fire // Ice`;

type Issue = {
	line: number;
	message: string;
	skipped: boolean;
	problem?: CardListProblem;
	/** A line combined with another, which doesn't block adding. */
	note?: CardListNote;
	/** Shown from before the line was edited, until typing pauses and it's checked again. */
	stale?: boolean;
};

export function AddCards(props: { onClose?: () => void }) {
	const { onClose: onHistoryClose } = props;
	const dispatch = useAppDispatch();
	const {
		deckId,
		text,
		board,
		submitting: isSubmitting,
		error,
		unknownCards
	} = useAppSelector(selectAddCards);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const summaryId = useId();
	const errorId = useId();
	const lint = useCardListLint(text);
	const [typingLine, setTypingLine] = useState<number | null>(null);

	const parsed = useMemo(() => parseCardList(text, board), [text, board]);
	const boardHintId = useId();
	const total = parsed.cards.reduce((sum, card) => sum + card.count, 0);
	const sideTotal = parsed.cards
		.filter((card) => card.board === 'side')
		.reduce((sum, card) => sum + card.count, 0);
	// A card in both boards is still one printing.
	const printingCount = new Set(
		parsed.cards.map(
			(card) => `${card.name.toLowerCase()}|${card.setCode ?? ''}`
		)
	).size;
	const uniqueNames = new Set(
		parsed.cards.map((card) => card.name.toLowerCase())
	).size;
	// Checker results for lines that haven't changed since they were analysed.
	const lines = text.split(/\r?\n/);
	const problems = lint.problems.filter(
		(problem) => lines[problem.line - 1] === problem.lineText
	);
	const problemLines = new Set(problems.map((problem) => problem.line));
	// The server's verdict from the last submit covers lines the checker hasn't.
	const unknownLines = parsed.cards.filter((card) =>
		unknownCards.includes(card.name.toLowerCase())
	);
	const issues: Issue[] = ([] as Issue[])
		.concat(
			parsed.errors.map((options) => {
				const { line, message } = options;
				return {
					line,
					message,
					skipped: false
				};
			}),
			problems.map((problem) => ({
				line: problem.line,
				message: `Unknown card: ${problem.name}`,
				skipped: false,
				problem
			})),
			unknownLines.flatMap((card) =>
				card.lines
					.filter((line) => !problemLines.has(line))
					.map((line) => ({
						line,
						message: `Unknown card: ${card.name}`,
						skipped: false
					}))
			),
			parsed.skipped.map((options) => {
				const { line, message } = options;
				return {
					line,
					message,
					skipped: true
				};
			}),
			parsed.notes.map((note) => ({
				line: note.line,
				message: note.message,
				skipped: true,
				note
			}))
		)
		.sort((a, b) => a.line - b.line);
	const hasBlockingIssues = issues.some((issue) => !issue.skipped);
	// The line being typed keeps its earlier rows, so the list doesn't jump on each key;
	// its current issues still block adding.
	const previousListed = useRef<Issue[]>([]);
	const listedIssues =
		typingLine === null
			? issues
			: issues
					.filter((issue) => issue.line !== typingLine)
					.concat(
						previousListed.current
							.filter((issue) => issue.line === typingLine)
							.map((issue) => ({
								line: issue.line,
								message: issue.message,
								skipped: issue.skipped,
								problem: issue.problem,
								note: issue.note,
								stale: true
							}))
					)
					.sort((a, b) => a.line - b.line);
	useEffect(() => {
		previousListed.current = listedIssues;
	});
	const canSubmit =
		!!deckId &&
		parsed.cards.length > 0 &&
		!hasBlockingIssues &&
		!isSubmitting;

	useEffect(() => {
		const previousFocus = document.activeElement as HTMLElement | null;
		textareaRef.current?.focus();
		return function () {
			return previousFocus?.focus();
		};
	}, []);

	function onClose() {
		dispatch(closeAddCards());
		onHistoryClose?.();
	}
	function submit() {
		if (!canSubmit) {
			textareaRef.current?.focus();
			return;
		}
		void dispatch(
			importDeckCards({
				deckId,
				cards: parsed.cards.map((options) => {
					const { name, count, setCode, board } = options;
					return {
						name,
						count,
						setCode,
						board
					};
				})
			})
		)
			.unwrap()
			.then(() => onHistoryClose?.())
			.catch(() => undefined);
	}

	/** Writes out what a note says will happen, so the list reads the way it's added. */
	function applyNote(note: CardListNote) {
		const textarea = textareaRef.current;
		if (!textarea) return;
		if (note.kind === 'duplicate') {
			mergeLines(textarea, note.firstLine, note.line);
			return;
		}
		const span = locateCardName(note.text);
		if (span && !span.printing)
			replaceInLine(
				textarea,
				note.line,
				span.end,
				span.end,
				` (${note.setCode})`
			);
	}

	function fix(problem: CardListProblem, name: string) {
		const textarea = textareaRef.current;
		if (textarea)
			replaceInLine(
				textarea,
				problem.line,
				problem.start,
				problem.end,
				name
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
			<header className={adderStyles['top-bar']}>
				<HeaderBackSlot>
					{/* Phones fill the screen and close from here, so Cancel hides. */}
					<HeaderBackButton
						inline
						label="Close add cards"
						onClick={() => {
							if (!isSubmitting) onClose();
						}}
					/>
				</HeaderBackSlot>
				<h2 id="add-cards-title">Add cards</h2>
			</header>
			<div className={`${adderStyles['body']} ${styles['body']}`}>
				<p className={adderStyles['intro']}>
					Paste a list with one card per line, like an Arena or MTGO
					export. Counts and set codes are optional.
				</p>
				<fieldset className={styles['board-picker']}>
					<legend>Add to</legend>
					<div className={styles['board-options']}>
						{DECK_BOARD_ORDER.map((option) => (
							<label key={option}>
								<input
									type="radio"
									name="add-cards-board"
									value={option}
									checked={board === option}
									disabled={isSubmitting}
									aria-describedby={boardHintId}
									onChange={() =>
										dispatch(setAddCardsBoard(option))
									}
								/>
								<span>{DECK_BOARD_LABELS[option]}</span>
							</label>
						))}
					</div>
					<p id={boardHintId} className={styles['board-hint']}>
						Lines under a “Deck” or “Sideboard” heading go to that
						board instead.
					</p>
				</fieldset>
				<div className={`${adderStyles['field']} ${styles['field']}`}>
					<label htmlFor="add-cards-list">Card list</label>
					<CardListEditor
						id="add-cards-list"
						className={styles['editor']}
						textareaRef={textareaRef}
						value={text}
						placeholder={PLACEHOLDER}
						disabled={isSubmitting}
						aria-describedby={`${summaryId}${error ? ` ${errorId}` : ''}`}
						aria-invalid={hasBlockingIssues}
						problems={problems}
						completions={lint.completions}
						onCompletionQuery={lint.requestCompletions}
						onTypingLineChange={setTypingLine}
						onChange={(value) => dispatch(setAddCardsText(value))}
					/>
					<p
						id={summaryId}
						className={`${adderStyles['field-hint']} ${styles['summary']}`}
						aria-live="polite"
					>
						{parsed.cards.length === 0
							? 'Press Ctrl+Enter or ⌘+Enter to add.'
							: `${total} ${total === 1 ? 'card' : 'cards'} (${uniqueNames} unique${printingCount > uniqueNames ? `, ${printingCount} printings` : ''}${sideTotal > 0 ? `, ${sideTotal} in sideboard` : ''}) ready to add.`}
					</p>
					{/* Always rendered at a fixed height, so issues coming and going don't move the dialog. */}
					<ul
						className={styles['issues']}
						aria-label="Lines needing attention"
					>
						{listedIssues.map((issue) => (
							<li
								key={`${issue.line}-${issue.message}`}
								className={
									issue.stale
										? styles['stale']
										: issue.skipped
											? styles['skipped']
											: undefined
								}
							>
								<span className={styles['line-number']}>
									Line {issue.line}
								</span>{' '}
								{issue.message}
								{issue.problem &&
									issue.problem.suggestions.length > 0 && (
										<DidYouMean
											problem={issue.problem}
											disabled={issue.stale}
											onPick={(name) =>
												fix(issue.problem!, name)
											}
										/>
									)}
								{issue.note && (
									<>
										{' '}
										<button
											type="button"
											className={styles['suggestion']}
											disabled={issue.stale}
											onClick={() =>
												applyNote(issue.note!)
											}
										>
											{issue.note.kind === 'duplicate'
												? `Merge into line ${issue.note.firstLine}`
												: `Write (${issue.note.setCode})`}
										</button>
									</>
								)}
							</li>
						))}
					</ul>
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
						`Add ${total} ${total === 1 ? 'card' : 'cards'}${sideTotal === total ? ' to sideboard' : ''}`
					) : (
						'Add cards'
					)}
				</Button>
			</div>
		</form>
	);
}

function DidYouMean(props: {
	problem: CardListProblem;
	/** Kept visible, so the row keeps its size, but its columns may be out of date. */
	disabled?: boolean;
	onPick: (name: string) => void;
}) {
	const { problem, disabled, onPick } = props;
	return (
		<>
			{' — did you mean '}
			{problem.suggestions.slice(0, 2).map((name, index) => (
				<React.Fragment key={name}>
					{index > 0 && ' or '}
					<button
						type="button"
						className={styles['suggestion']}
						disabled={disabled}
						aria-label={`Replace line ${problem.line} with ${name}`}
						onClick={() => onPick(name)}
					>
						{name}
					</button>
				</React.Fragment>
			))}
			?
		</>
	);
}
