import type { CardEdit, DeckBoard } from '@torimtg/core';
import { DECK_BOARD_ORDER, otherBoard } from './boards';

export const MAX_COPIES = 999;

/** Copies of one printing in each board. */
export type BoardCounts = Record<DeckBoard, number>;

export const NO_COPIES: BoardCounts = { main: 0, side: 0 };

/** Every printing's copies in each board, by UUID. */
export type PrintingCounts = ReadonlyMap<string, BoardCounts>;

/**
 * One change the card editor makes, stated as what the user did, not the count it
 * leads to. Steps apply to whatever the deck holds when they are saved, so a
 * step taken before an earlier one has saved still counts.
 */
export type DeckCardStep =
	/** Adds (positive) or removes (negative) copies of a printing in one board. */
	| { type: 'adjust'; uuid: string; board: DeckBoard; delta: number }
	/** Moves up to `count` copies of a printing out of `from` into the other board. */
	| { type: 'move'; uuid: string; from: DeckBoard; count: number }
	/** Moves every copy of `from`, in both boards, to the printing `to`. */
	| { type: 'replace'; from: string; to: string };

export function countsIn(counts: PrintingCounts, uuid: string): BoardCounts {
	return counts.get(uuid) ?? NO_COPIES;
}

/** Totals each printing's copies per board from deck card rows. */
export function printingCounts(
	cards: readonly { uuid: string; count: number; board?: DeckBoard }[]
): Map<string, BoardCounts> {
	const byUuid = new Map<string, BoardCounts>();
	for (const card of cards) {
		const existing = countsIn(byUuid, card.uuid);
		const counts: BoardCounts = { main: existing.main, side: existing.side };
		counts[card.board ?? 'main'] += card.count;
		byUuid.set(card.uuid, counts);
	}
	return byUuid;
}

function clamp(count: number) {
	return Math.max(0, Math.min(MAX_COPIES, count));
}

/** `counts` after `step`. A step the deck no longer allows does as much as it can. */
export function applyStep(
	counts: PrintingCounts,
	step: DeckCardStep
): Map<string, BoardCounts> {
	const next = new Map(counts);
	switch (step.type) {
		case 'adjust': {
			const current = countsIn(counts, step.uuid);
			const adjusted: BoardCounts = { main: current.main, side: current.side };
			adjusted[step.board] = clamp(current[step.board] + step.delta);
			next.set(step.uuid, adjusted);
			return next;
		}
		case 'move': {
			const current = countsIn(counts, step.uuid);
			const to = otherBoard(step.from);
			const moved = Math.max(
				0,
				Math.min(step.count, current[step.from], MAX_COPIES - current[to])
			);
			const movedCounts: BoardCounts = {
				main: current.main,
				side: current.side
			};
			movedCounts[step.from] = current[step.from] - moved;
			movedCounts[to] = current[to] + moved;
			next.set(step.uuid, movedCounts);
			return next;
		}
		case 'replace': {
			const source = countsIn(counts, step.from);
			const destination = countsIn(counts, step.to);
			if (step.from === step.to) return next;
			next.set(step.from, { main: NO_COPIES.main, side: NO_COPIES.side });
			next.set(step.to, {
				main: clamp(destination.main + source.main),
				side: clamp(destination.side + source.side)
			});
			return next;
		}
	}
}

export function applySteps(
	counts: PrintingCounts,
	steps: readonly DeckCardStep[]
): Map<string, BoardCounts> {
	return steps.reduce(applyStep, new Map(counts));
}

/**
 * The exact counts that turn `before` into `after`, one per printing and board that
 * changed. The main board is left implicit, matching edits saved before boards existed.
 */
export function countEdits(
	before: PrintingCounts,
	after: PrintingCounts
): CardEdit[] {
	return Array.from(
		new Set(Array.from(before.keys()).concat(Array.from(after.keys())))
	).flatMap((uuid) =>
		DECK_BOARD_ORDER.filter(
			(board) => countsIn(before, uuid)[board] !== countsIn(after, uuid)[board]
		).map((board): CardEdit =>
			board === 'side'
				? {
						uuid,
						action: 'set',
						count: countsIn(after, uuid)[board],
						board
					}
				: { uuid, action: 'set', count: countsIn(after, uuid)[board] }
		)
	);
}
