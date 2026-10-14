import React from 'react';
import type { DeckBoard } from '../../../../../domain/models/deck';
import { MAX_COPIES } from '../../../../../domain/deck/card-steps';
import {
	DECK_BOARD_LABELS,
	DECK_BOARD_ORDER,
	otherBoard
} from '../../../../../domain/deck/boards';
import { HeaderBackButton } from 'src/ui/kit/components/BackLink/BackLink';
import { HeaderBackSlot } from 'src/ui/kit/components/Header/HeaderBackSlot';
import { BoardChips } from 'src/ui/kit/components/OwnershipBadge/OwnershipBadge';
import type { ManagePrintingsManager } from './use-manage-printings';
import { boardName, copies, setNameOf, totalOf } from './use-manage-printings';

import styles from './manage-printings.module.css';

const SHORT_BOARD_LABELS: Record<DeckBoard, string> = {
	main: 'Main',
	side: 'Side'
};

/** The editor's top bar: back (into the app bar on phones), the card, its totals and Done. */
export function ManagePrintingsHeader(props: { manager: ManagePrintingsManager }) {
	const { manager } = props;
	const { view, target, summary, saving, stopChoosingPrinting, onClose } = manager;
	return (
		<header className={styles['header']}>
			<HeaderBackSlot>
				<HeaderBackButton
					inline
					label={
						view === 'all'
							? 'Back to the printings in this deck'
							: 'Close card editor'
					}
					onClick={view === 'all' ? stopChoosingPrinting : onClose}
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
				<button type="button" className={styles['done']} onClick={onClose}>
					Done
				</button>
			</div>
		</header>
	);
}

/** A deck row's printing: name, set line and owned copies. */
export function DeckPrintingText(props: {
	manager: ManagePrintingsManager;
	uuid: string;
	setLine: string;
}) {
	const { manager, uuid, setLine } = props;
	const owned = manager.ownedOf(uuid);
	return (
		<div className={styles['deck-row-text']}>
			<span className={styles['deck-row-name']}>
				{manager.rowPrinting(uuid).name}
			</span>
			<span className={styles['set-code']}>{setLine}</span>
			<BoardChips
				chips={owned > 0 ? [{ label: `own ${owned}`, tone: 'owned' }] : undefined}
			/>
		</div>
	);
}

/**
 * A deck row's controls: the row itself, which a click makes the one whose art the
 * printings change, and each board's stepper with arrows that move a copy between them.
 */
export function DeckRowControls(props: {
	manager: ManagePrintingsManager;
	uuid: string;
}) {
	const { manager, uuid } = props;
	const rowCounts = manager.countsOf(uuid);
	const label = `${manager.rowPrinting(uuid).name}, ${setNameOf(manager.rowPrinting(uuid))}`;
	return (
		<>
			{/* Covers the whole row, under its steppers. */}
			<button
				type="button"
				className={styles['select-row']}
				aria-label={`Change the art of all ${copies(totalOf(rowCounts))} of ${label}`}
				aria-pressed={manager.replacingUuid === uuid}
				onClick={() => manager.startReplacing(uuid)}
			/>
			<div className={styles['board-counts']}>
				<BoardStepper
					board="main"
					label={label}
					count={rowCounts.main}
					onChange={(count) => manager.setCount(uuid, 'main', count)}
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
						disabled={rowCounts.main === 0 || rowCounts.side >= MAX_COPIES}
						onClick={() => manager.moveCopies(uuid, 'main', 1)}
					>
						<ArrowIcon direction="right" />
					</button>
					<button
						type="button"
						aria-label={`Move a ${label} copy to the main board`}
						title="Move a copy to the main board"
						disabled={rowCounts.side === 0 || rowCounts.main >= MAX_COPIES}
						onClick={() => manager.moveCopies(uuid, 'side', 1)}
					>
						<ArrowIcon direction="left" />
					</button>
				</div>
				<BoardStepper
					board="side"
					label={label}
					count={rowCounts.side}
					onChange={(count) => manager.setCount(uuid, 'side', count)}
				/>
			</div>
		</>
	);
}

/**
 * Below the deck rows: a note when none are left, adding another printing,
 * moving a whole board, and each board's total.
 */
export function DeckPaneActions(props: {
	manager: ManagePrintingsManager;
	/** Under "Add a printing": where the printings come from. */
	addHint: string;
}) {
	const { manager, addHint } = props;
	const { rows, target, boardTotals, adding } = manager;
	return (
		<>
			{rows.length === 0 && (
				<p className={styles['empty']}>
					No copies left, so {target.name} is out of the deck. Add a
					printing to put it back.
				</p>
			)}
			{/* Turns the printings beside the deck from changing a row's art to adding copies. */}
			<button
				type="button"
				className={styles['add-printing']}
				aria-pressed={adding}
				onClick={adding ? manager.stopChoosingPrinting : manager.startAdding}
			>
				<span className={styles['add-printing-icon']} aria-hidden="true">
					<PlusIcon />
				</span>
				<span className={styles['add-printing-text']}>
					<span>Add a printing</span>
					<span>{addHint}</span>
				</span>
			</button>
			{rows.length > 0 && (
				<div className={styles['move-all']}>
					{DECK_BOARD_ORDER.map((from) => (
						<button
							key={from}
							type="button"
							disabled={boardTotals[from] === 0}
							aria-label={`Move every copy to the ${boardName(otherBoard(from))}`}
							onClick={() => manager.moveAll(from)}
						>
							{`All to ${boardName(otherBoard(from))}`}
						</button>
					))}
				</div>
			)}
			<dl className={styles['total']}>
				{DECK_BOARD_ORDER.map((board) => (
					<div key={board}>
						<dt>{DECK_BOARD_LABELS[board]}</dt>
						<dd>{boardTotals[board]}</dd>
					</div>
				))}
			</dl>
		</>
	);
}

/** The "all printings" side's heading, the board a click adds to, and the set search. */
export function AllPrintingsHeader(props: { manager: ManagePrintingsManager }) {
	const { manager } = props;
	const { replacing, replacingCount, addBoard, query } = manager;
	return (
		<div className={styles['all-header']}>
			<div className={styles['all-heading']}>
				<h3 id="manage-printings-all" className={styles['pane-label']}>
					{replacing ? 'Change printing' : 'All printings'}
				</h3>
				{/* Both texts share one cell, so the taller sets its height in either mode. */}
				<p className={styles['all-hint']}>
					<span hidden={!!replacing}>
						{`Choose a printing to add a copy to the ${boardName(addBoard)}.`}
					</span>
					<span hidden={!replacing}>
						{`Choose a new printing for all ${copies(replacingCount)}. Each board keeps its count.`}
					</span>
				</p>
			</div>
			{/* Stays mounted while replacing, keeping its space so the grid below doesn't move. */}
			<div
				className={styles['add-board']}
				role="radiogroup"
				aria-label="Add copies to"
				hidden={!!replacing}
			>
				{DECK_BOARD_ORDER.map((board) => (
					<button
						key={board}
						type="button"
						role="radio"
						aria-checked={addBoard === board}
						onClick={() => manager.setAddBoard(board)}
					>
						{DECK_BOARD_LABELS[board]}
					</button>
				))}
			</div>
			<input
				className={styles['search']}
				type="search"
				placeholder="Search sets"
				aria-label="Search printings by set name or code"
				value={query}
				onChange={(event) => manager.setQuery(event.target.value)}
			/>
		</div>
	);
}

/** Why the "all printings" side is empty, when no printing matches. */
export function noChoicesMessage(manager: ManagePrintingsManager): string {
	return manager.query.trim()
		? `No sets match “${manager.query.trim()}”.`
		: manager.replacing
			? 'No replacement printings found.'
			: 'No other printings found.';
}

/** Takes one copy of a printing out of the board a click adds to. */
export function ChoiceRemoveButton(props: {
	manager: ManagePrintingsManager;
	uuid: string;
	className: string;
	/** Hides it while replacing, keeping its space. */
	hidden: boolean;
}) {
	const { manager, uuid, className, hidden } = props;
	const choice = manager.choiceOf(uuid);
	return (
		<button
			type="button"
			className={className}
			hidden={hidden}
			aria-label={`Remove a ${choice.label} copy from the ${boardName(manager.addBoard)}`}
			onClick={() => manager.setCount(uuid, manager.addBoard, choice.count - 1)}
		>
			<span>
				<MinusIcon />
			</span>
		</button>
	);
}

/** The phone's footer under the printings: totals and back to the deck. */
export function AllPrintingsFooter(props: { manager: ManagePrintingsManager }) {
	const { manager } = props;
	return (
		<div className={styles['all-footer']}>
			<span>{manager.summary}</span>
			<button
				type="button"
				className={styles['done']}
				onClick={manager.stopChoosingPrinting}
			>
				Done
			</button>
		</div>
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
	const name = boardName(board);
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
					aria-label={`Remove a ${label} copy from the ${name}`}
					disabled={count === 0}
					onClick={() => onChange(count - 1)}
				>
					<MinusIcon />
				</button>
				<span
					className={styles['stepper-count']}
					aria-label={`${copies(count)} in the ${name}`}
				>
					{count}
				</span>
				<button
					type="button"
					aria-label={`Add a ${label} copy to the ${name}`}
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
