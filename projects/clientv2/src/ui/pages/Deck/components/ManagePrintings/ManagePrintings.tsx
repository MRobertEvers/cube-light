import React, { useEffect, useMemo, useState } from 'react';
import type { CardPrinting } from '../../../../../domain/models/card';
import { useAppDispatch } from 'src/redux/use-app-dispatch';
import { readCardPrintings } from 'src/redux/cards/cards.thunks';
import type {
	DeckBoard,
	DeckCardEntry
} from '../../../../../domain/models/deck';
import type { DeckCardEditTarget } from '../../../../../domain/deck/group-deck-cards';
import {
	applySteps,
	countsIn,
	MAX_COPIES,
	printingCounts,
	type BoardCounts,
	type DeckCardStep
} from '../../../../../domain/deck/card-steps';
import {
	DECK_BOARD_LABELS,
	DECK_BOARD_ORDER,
	otherBoard
} from '../../../../../domain/deck/boards';

import { HeaderBackButton } from 'src/ui/kit/components/BackLink/BackLink';
import { HeaderBackSlot } from 'src/ui/kit/components/Header/HeaderBackSlot';
import styles from './manage-printings.module.css';

const SHORT_BOARD_LABELS: Record<DeckBoard, string> = {
	main: 'Main',
	side: 'Side'
};

type PrintingInfo = {
	name: string;
	uuid: string;
	setCode: string;
	setName: string | null;
	image: string | undefined;
};

function totalOf(counts: BoardCounts) {
	return counts.main + counts.side;
}

function deckCardInfo(card: DeckCardEntry): PrintingInfo {
	return {
		name: card.name,
		uuid: card.uuid,
		setCode: card.setCode,
		setName: null,
		image: card.images?.normal ?? card.image
	};
}

function copies(count: number) {
	return `${count} ${count === 1 ? 'copy' : 'copies'}`;
}

export type ManagePrintingsProps = {
	/** The card as the editor opened on it, which fixes its rows' order and labels. */
	target: DeckCardEditTarget;
	/** The deck's printings of the card now, in any board. */
	cards: readonly DeckCardEntry[];
	/** Saves steps at once; settles when the deck in the store includes them. */
	onSteps: (steps: DeckCardStep[]) => Promise<void>;
	onClose: () => void;
};

/** Steps taken whose save hasn't settled, shown on top of the deck until it has. */
type PendingSteps = { id: number; steps: DeckCardStep[] };

let nextPendingId = 0;

/**
 * Edits how many copies of each printing of one card the deck holds in each board:
 * main and side steppers per printing, arrows that move a copy between the boards,
 * a way to move a whole row to another printing, and every printing of the card
 * beside them, where a click adds a copy to the chosen board. Every step saves as
 * it is taken. Phones show one side at a time.
 */
export function ManagePrintings(props: ManagePrintingsProps) {
	const { target, cards, onSteps, onClose } = props;
	const dispatch = useAppDispatch();
	const initial = useMemo(() => printingCounts(target.printings), [target]);
	const saved = useMemo(() => printingCounts(cards), [cards]);
	const [pending, setPending] = useState<PendingSteps[]>([]);
	const counts = useMemo(
		() =>
			applySteps(
				saved,
				pending.flatMap((entry) => entry.steps)
			),
		[saved, pending]
	);
	// Printings listed on the deck side, the opened board's first, in the order they joined.
	const [order, setOrder] = useState(() =>
		[...initial.keys()].sort(
			(a, b) =>
				Number(initial.get(b)![target.board] > 0) -
				Number(initial.get(a)![target.board] > 0)
		)
	);
	// The board a click in the printings grid adds to.
	const [addBoard, setAddBoard] = useState<DeckBoard>(target.board);
	const [printings, setPrintings] = useState<CardPrinting[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [query, setQuery] = useState('');
	const [view, setView] = useState<'deck' | 'all'>('deck');
	const [replacingUuid, setReplacingUuid] = useState<string | null>(null);
	const [saveError, setSaveError] = useState<string | null>(null);
	const saving = pending.length > 0;
	useEffect(() => {
		let active = true;
		dispatch(readCardPrintings(target.name))
			.then(
				(items) => {
					if (active) setPrintings(items);
				},
				() => {
					if (active)
						setLoadError(
							'Other printings could not be loaded. You can still change the copies you have.'
						);
				}
			)
			.finally(() => {
				if (active) setLoading(false);
			});
		return function () {
			active = false;
		};
	}, [dispatch, target.name]);

	useEffect(() => {
		function closeOnEscape(event: KeyboardEvent) {
			if (event.key === 'Escape') onClose();
		}
		window.addEventListener('keydown', closeOnEscape);
		return function () {
			return window.removeEventListener('keydown', closeOnEscape);
		};
	}, [onClose]);

	// Keep rows already in the deck on their opening snapshot. The printings request
	// returns richer labels and images, but must not rewrite text that is already shown.
	const deckInfo = useMemo(
		() =>
			new Map(
				target.printings.map((card) => [card.uuid, deckCardInfo(card)])
			),
		[target.printings]
	);
	// Printings that join the deck after it opens keep the label the printings grid gave them.
	const info = useMemo(() => {
		const byUuid = new Map<string, PrintingInfo>();
		for (const printing of printings)
			byUuid.set(printing.uuid, {
				name: printing.name,
				uuid: printing.uuid,
				setCode: printing.setCode,
				setName: printing.setName,
				image: printing.image ?? printing.art ?? undefined
			});
		for (const [uuid, printing] of deckInfo)
			if (!byUuid.has(uuid)) byUuid.set(uuid, printing);
		for (const card of cards)
			if (!byUuid.has(card.uuid))
				byUuid.set(card.uuid, deckCardInfo(card));
		return byUuid;
	}, [printings, deckInfo, cards]);

	// Printings without an image can't be told apart, unless the deck already has them.
	// The deck's own printings come first, since a set can have several of the card.
	const choices = useMemo(() => {
		const needle = query.trim().toLowerCase();
		return printings
			.toSorted(
				(a, b) =>
					Number(initial.has(b.uuid)) - Number(initial.has(a.uuid))
			)
			.filter(
				(printing) => !!printing.image || initial.has(printing.uuid)
			)
			.filter(
				(printing) =>
					!needle ||
					printing.setCode.toLowerCase().includes(needle) ||
					!!printing.setName?.toLowerCase().includes(needle)
			);
	}, [printings, query, initial]);

	function countsOf(uuid: string): BoardCounts {
		return countsIn(counts, uuid);
	}
	// Printings that joined elsewhere, such as on another device, follow the opening ones.
	const rows = [
		...order,
		...[...counts.keys()].filter((uuid) => !order.includes(uuid))
	].filter((uuid) => totalOf(countsOf(uuid)) > 0);
	const boardTotals: BoardCounts = {
		main: rows.reduce((sum, uuid) => sum + countsOf(uuid).main, 0),
		side: rows.reduce((sum, uuid) => sum + countsOf(uuid).side, 0)
	};

	/** Shows `steps` at once and saves them; they stay shown until the store has them. */
	function take(steps: DeckCardStep[]) {
		if (steps.length === 0) return;
		const entry = { id: nextPendingId++, steps };
		setPending((previous) => [...previous, entry]);
		setSaveError(null);
		for (const step of steps) {
			const joined =
				step.type === 'adjust' && step.delta > 0
					? step.uuid
					: step.type === 'replace'
						? step.to
						: null;
			if (joined)
				setOrder((previous) => {
					if (previous.includes(joined)) return previous;
					if (step.type === 'replace')
						return previous.map((uuid) =>
							uuid === step.from ? joined : uuid
						);
					return [...previous, joined];
				});
		}
		onSteps(steps)
			.catch(() =>
				setSaveError(
					'That change could not be saved. Please try again.'
				)
			)
			.finally(() =>
				setPending((previous) =>
					previous.filter((item) => item !== entry)
				)
			);
	}

	function setCount(uuid: string, board: DeckBoard, count: number) {
		const delta = count - countsOf(uuid)[board];
		if (delta !== 0) take([{ type: 'adjust', uuid, board, delta }]);
	}

	/** Moves `count` copies of a printing out of `from` into the other board. */
	function moveCopies(uuid: string, from: DeckBoard, count: number) {
		take([{ type: 'move', uuid, from, count }]);
	}

	function moveAll(from: DeckBoard) {
		take(
			rows
				.filter((uuid) => countsOf(uuid)[from] > 0)
				.map((uuid) => ({
					type: 'move' as const,
					uuid,
					from,
					count: MAX_COPIES
				}))
		);
	}

	function startReplacing(uuid: string) {
		setReplacingUuid(uuid);
		setView('all');
	}

	function stopChoosingPrinting() {
		setReplacingUuid(null);
		setView('deck');
	}

	function canReplace(sourceUuid: string, targetUuid: string) {
		const source = countsOf(sourceUuid);
		const destination = countsOf(targetUuid);
		return (
			sourceUuid !== targetUuid &&
			totalOf(source) > 0 &&
			DECK_BOARD_ORDER.every(
				(board) => source[board] + destination[board] <= MAX_COPIES
			)
		);
	}

	/** Moves every copy of one printing, in both boards, to another printing. */
	function replaceAllCopies(sourceUuid: string, targetUuid: string) {
		if (!canReplace(sourceUuid, targetUuid)) return;
		take([{ type: 'replace', from: sourceUuid, to: targetUuid }]);
		stopChoosingPrinting();
	}

	const summary = `${boardTotals.main} main · ${boardTotals.side} side`;
	const replacing = replacingUuid ? info.get(replacingUuid) : undefined;
	const replacingCount = replacingUuid ? totalOf(countsOf(replacingUuid)) : 0;
	const visibleChoices = replacingUuid
		? choices.filter((choice) => choice.uuid !== replacingUuid)
		: choices;
	function setNameOf(printing: PrintingInfo) {
		return printing.setName ?? printing.setCode;
	}

	return (
		<section
			className={`${styles['container']} ${styles[`show-${view}`]}`}
			role="dialog"
			aria-modal="true"
			aria-labelledby="manage-printings-title"
			aria-busy={saving}
		>
			<header className={styles['header']}>
				<HeaderBackSlot>
					<HeaderBackButton
						inline
						label={
							view === 'all'
								? 'Back to the printings in this deck'
								: 'Close card editor'
						}
						onClick={
							view === 'all' ? stopChoosingPrinting : onClose
						}
					/>
				</HeaderBackSlot>
				<div className={styles['title']}>
					<h2 id="manage-printings-title">{target.name}</h2>
					<p aria-live="polite">
						{summary}
						{saving ? ' · Saving…' : ''}
					</p>
				</div>
				<div className={styles['header-actions']}>
					<button
						type="button"
						className={styles['done']}
						onClick={onClose}
					>
						Done
					</button>
				</div>
			</header>
			{saveError && (
				<p className={styles['save-error']} role="alert">
					{saveError}
				</p>
			)}
			<div className={styles['body']}>
				<section
					className={`${styles['pane']} ${styles['deck-pane']}`}
					aria-labelledby="manage-printings-deck"
				>
					<h3
						id="manage-printings-deck"
						className={styles['pane-label']}
					>
						In this deck
					</h3>
					<ul className={styles['deck-rows']}>
						{rows.map((uuid) => {
							const printing =
								deckInfo.get(uuid) ?? info.get(uuid)!;
							const rowCounts = countsOf(uuid);
							const setName = setNameOf(printing);
							const label = `${printing.name}, ${setName}`;
							return (
								<li
									key={uuid}
									className={`${styles['deck-row']} ${
										replacingUuid === uuid
											? styles['replacing']
											: ''
									}`}
								>
									<img
										src={printing.image}
										alt=""
										loading="lazy"
									/>
									<div className={styles['deck-row-text']}>
										<span
											className={styles['deck-row-name']}
										>
											{printing.name}
										</span>
										<span className={styles['set-code']}>
											{setName}
										</span>
									</div>
									<button
										type="button"
										className={styles['change-printing']}
										aria-label={`Change all ${copies(totalOf(rowCounts))} of ${label} to another printing`}
										title="Change all copies to another printing"
										disabled={
											loading || !!loadError
										}
										onClick={() => startReplacing(uuid)}
									>
										<ReplaceIcon />
									</button>
									<div className={styles['board-counts']}>
										<BoardStepper
											board="main"
											label={label}
											count={rowCounts.main}
											onChange={(count) =>
												setCount(uuid, 'main', count)
											}
										/>
										<div
											className={styles['move-copy']}
											role="group"
											aria-label={`Move ${label} copies between boards`}
										>
											<button
												type="button"
												aria-label={`Move a ${label} copy to the sideboard`}
												title="Move a copy to the sideboard"
												disabled={
													rowCounts.main === 0 ||
													rowCounts.side >= MAX_COPIES
												}
												onClick={() =>
													moveCopies(uuid, 'main', 1)
												}
											>
												<ArrowIcon direction="right" />
											</button>
											<button
												type="button"
												aria-label={`Move a ${label} copy to the main board`}
												title="Move a copy to the main board"
												disabled={
													rowCounts.side === 0 ||
													rowCounts.main >= MAX_COPIES
												}
												onClick={() =>
													moveCopies(uuid, 'side', 1)
												}
											>
												<ArrowIcon direction="left" />
											</button>
										</div>
										<BoardStepper
											board="side"
											label={label}
											count={rowCounts.side}
											onChange={(count) =>
												setCount(uuid, 'side', count)
											}
										/>
									</div>
								</li>
							);
						})}
					</ul>
					{rows.length === 0 && (
						<p className={styles['empty']}>
							No copies left, so {target.name} is out of the deck.
							Add a printing to put it back.
						</p>
					)}
					{rows.length > 0 && (
						<div className={styles['move-all']}>
							{DECK_BOARD_ORDER.map((from) => (
								<button
									key={from}
									type="button"
									disabled={boardTotals[from] === 0}
									aria-label={`Move every copy to the ${otherBoard(from) === 'side' ? 'sideboard' : 'main board'}`}
									onClick={() => moveAll(from)}
								>
									{`All to ${otherBoard(from) === 'side' ? 'sideboard' : 'main board'}`}
								</button>
							))}
						</div>
					)}
					<button
						type="button"
						className={styles['add-printing']}
						onClick={() => {
							setReplacingUuid(null);
							setView('all');
						}}
					>
						<span
							className={styles['add-printing-icon']}
							aria-hidden="true"
						>
							<PlusIcon />
						</span>
						<span className={styles['add-printing-text']}>
							<span>Add a printing</span>
							<span>Browse available sets</span>
						</span>
					</button>
					<dl className={styles['total']}>
						{DECK_BOARD_ORDER.map((board) => (
							<div key={board}>
								<dt>{DECK_BOARD_LABELS[board]}</dt>
								<dd>{boardTotals[board]}</dd>
							</div>
						))}
					</dl>
				</section>
				<section
					className={`${styles['pane']} ${styles['all-pane']}`}
					aria-labelledby="manage-printings-all"
				>
					<div className={styles['all-header']}>
						<div className={styles['all-heading']}>
							<h3
								id="manage-printings-all"
								className={styles['pane-label']}
							>
								{replacing
									? 'Change printing'
									: 'All printings'}
							</h3>
							<p>
								{replacing
									? `Choose a new printing for all ${copies(replacingCount)} from ${setNameOf(replacing)}. Each board keeps its count.`
									: `Choose a printing to add a copy to the ${addBoard === 'side' ? 'sideboard' : 'main board'}.`}
							</p>
						</div>
						{!replacing && (
							<div
								className={styles['add-board']}
								role="radiogroup"
								aria-label="Add copies to"
							>
								{DECK_BOARD_ORDER.map((board) => (
									<button
										key={board}
										type="button"
										role="radio"
										aria-checked={addBoard === board}
										onClick={() => setAddBoard(board)}
									>
										{DECK_BOARD_LABELS[board]}
									</button>
								))}
							</div>
						)}
						<input
							className={styles['search']}
							type="search"
							placeholder="Search sets"
							aria-label="Search printings by set name or code"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
						/>
					</div>
					<div className={styles['grid-scroll']}>
						{loading && (
							<p className={styles['message']} role="status">
								Loading printings…
							</p>
						)}
						{loadError && (
							<p className={styles['message']} role="alert">
								{loadError}
							</p>
						)}
						{!loading &&
							!loadError &&
							visibleChoices.length === 0 && (
								<p className={styles['message']}>
									{query.trim()
										? `No sets match “${query.trim()}”.`
										: replacing
											? 'No replacement printings found.'
											: 'No other printings found.'}
								</p>
							)}
						<ul className={styles['grid']}>
							{visibleChoices.map((choice) => {
								const printing = info.get(choice.uuid)!;
								const tileCounts = countsOf(choice.uuid);
								const count = tileCounts[addBoard];
								const setName = setNameOf(printing);
								const label = `${printing.name}, ${setName}`;
								const boardName =
									addBoard === 'side'
										? 'sideboard'
										: 'main board';
								const inDeck = DECK_BOARD_ORDER.filter(
									(board) => tileCounts[board] > 0
								)
									.map(
										(board) =>
											`${tileCounts[board]} in ${board === 'side' ? 'sideboard' : 'main board'}`
									)
									.join(', ');
								return (
									<li
										key={choice.uuid}
										className={
											totalOf(tileCounts) > 0
												? styles['in-deck']
												: undefined
										}
									>
										<button
											type="button"
											className={styles['tile']}
											title={label}
											aria-label={
												replacing
													? `Change all ${copies(replacingCount)} to ${label}${inDeck ? `, ${inDeck} already` : ''}`
													: `Add a ${label} copy to the ${boardName}${inDeck ? `, ${inDeck}` : ''}`
											}
											disabled={
												replacingUuid
													? !canReplace(
															replacingUuid,
															choice.uuid
														)
													: count >= MAX_COPIES
											}
											onClick={() => {
												if (replacingUuid)
													replaceAllCopies(
														replacingUuid,
														choice.uuid
													);
												else
													setCount(
														choice.uuid,
														addBoard,
														count + 1
													);
											}}
										>
											<span
												className={styles['tile-image']}
											>
												<img
													src={printing.image}
													alt=""
													loading="lazy"
												/>
												{totalOf(tileCounts) > 0 && (
													<span
														className={
															styles['badges']
														}
														aria-hidden="true"
													>
														{DECK_BOARD_ORDER.filter(
															(board) =>
																tileCounts[
																	board
																] > 0
														).map((board) => (
															<span
																key={board}
																className={
																	styles[
																		'badge'
																	]
																}
																data-board={
																	board
																}
															>
																{board ===
																'side'
																	? `SB ×${tileCounts[board]}`
																	: `×${tileCounts[board]}`}
															</span>
														))}
													</span>
												)}
											</span>
											<span
												className={styles['tile-code']}
											>
												{printing.setCode}
											</span>
											<span
												className={styles['tile-name']}
											>
												{printing.setName ?? ' '}
											</span>
										</button>
										{count > 0 && !replacing && (
											<button
												type="button"
												className={
													styles['tile-remove']
												}
												aria-label={`Remove a ${label} copy from the ${boardName}`}
												onClick={() =>
													setCount(
														choice.uuid,
														addBoard,
														count - 1
													)
												}
											>
												<span>
													<MinusIcon />
												</span>
											</button>
										)}
									</li>
								);
							})}
						</ul>
					</div>
					<div className={styles['all-footer']}>
						<span>{summary}</span>
						<button
							type="button"
							className={styles['done']}
							onClick={stopChoosingPrinting}
						>
							Done
						</button>
					</div>
				</section>
			</div>
		</section>
	);
}

type BoardStepperProps = {
	board: DeckBoard;
	/** The printing, for button labels. */
	label: string;
	count: number;
	onChange: (count: number) => void;
};

/** One board's copies of a printing. Zero is allowed while the other board has copies. */
function BoardStepper(props: BoardStepperProps) {
	const { board, label, count, onChange } = props;
	const boardName = board === 'side' ? 'sideboard' : 'main board';
	return (
		<div
			className={styles['board-stepper']}
			data-board={board}
			data-empty={count === 0 || undefined}
		>
			<span className={styles['board-stepper-label']} aria-hidden="true">
				{SHORT_BOARD_LABELS[board]}
			</span>
			<div className={styles['stepper']}>
				<button
					type="button"
					aria-label={`Remove a ${label} copy from the ${boardName}`}
					disabled={count === 0}
					onClick={() => onChange(count - 1)}
				>
					<MinusIcon />
				</button>
				<span
					className={styles['stepper-count']}
					aria-label={`${copies(count)} in the ${boardName}`}
				>
					{count}
				</span>
				<button
					type="button"
					aria-label={`Add a ${label} copy to the ${boardName}`}
					disabled={count >= MAX_COPIES}
					onClick={() => onChange(count + 1)}
				>
					<PlusIcon />
				</button>
			</div>
		</div>
	);
}

function ArrowIcon(props: { direction: 'left' | 'right' }) {
	const { direction } = props;
	return (
		<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
			<path
				d={
					direction === 'right'
						? 'M3 8h9.5M9 4.5 12.5 8 9 11.5'
						: 'M13 8H3.5M7 4.5 3.5 8 7 11.5'
				}
				fill="none"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function MinusIcon() {
	return (
		<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
			<path
				d="M3.5 8h9"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
			/>
		</svg>
	);
}

function PlusIcon() {
	return (
		<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
			<path
				d="M8 3.5v9M3.5 8h9"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
			/>
		</svg>
	);
}

function ReplaceIcon() {
	return (
		<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
			<path
				d="M2.5 5.5h9M9.5 3.5l2 2-2 2M13.5 10.5h-9M6.5 8.5l-2 2 2 2"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
