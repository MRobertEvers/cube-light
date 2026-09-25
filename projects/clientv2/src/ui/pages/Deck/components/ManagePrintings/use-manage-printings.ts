import { useMemo, useState } from 'react';
import type { CardPrinting } from '../../../../../domain/models/card';
import type { DeckBoard, DeckCardEntry } from '../../../../../domain/models/deck';
import {
	applySteps,
	countsIn,
	MAX_COPIES,
	printingCounts,
	type BoardCounts,
	type DeckCardStep
} from '../../../../../domain/deck/card-steps';
import { DECK_BOARD_ORDER } from '../../../../../domain/deck/boards';
import { selectOwnership } from 'src/redux/library/library.selectors';
import { useAppSelector } from 'src/redux/use-app-selector';
import { useCloseOnEscape } from 'src/ui/kit/hooks/useCloseOnEscape';
import type { ManagePrintingsProps, PrintingInfo } from './manage-printings.types';

export function totalOf(counts: BoardCounts) {
	return counts.main + counts.side;
}

export function copies(count: number) {
	return `${count} ${count === 1 ? 'copy' : 'copies'}`;
}

export function boardName(board: DeckBoard) {
	return board === 'side' ? 'sideboard' : 'main board';
}

export function setNameOf(printing: PrintingInfo) {
	return printing.setName ?? printing.setCode;
}

function deckCardInfo(card: DeckCardEntry): PrintingInfo {
	return {
		name: card.name,
		uuid: card.uuid,
		setCode: card.setCode,
		setName: null,
		number: card.number,
		image: card.images?.normal ?? card.image
	};
}

/** The deck's own printings of the card, as printings to choose between. */
export function printingsInDeck(
	target: readonly DeckCardEntry[],
	cards: readonly DeckCardEntry[]
): CardPrinting[] {
	const byUuid = new Map<string, CardPrinting>();
	for (const card of target.concat(cards))
		if (!byUuid.has(card.uuid))
			byUuid.set(card.uuid, {
				name: card.name,
				uuid: card.uuid,
				setCode: card.setCode,
				setName: null,
				image: card.images?.normal ?? card.image,
				art: card.art
			});
	return Array.from(byUuid.values());
}

/** Steps taken whose save hasn't settled, shown on top of the deck until it has. */
type PendingSteps = { id: number; steps: DeckCardStep[] };

let nextPendingId = 0;

/** One printing in the "all printings" side, as a click there would change it. */
export type PrintingChoice = {
	uuid: string;
	printing: PrintingInfo;
	counts: BoardCounts;
	/** Copies in the board a click adds to. */
	count: number;
	/** Printing and set, for labels. */
	label: string;
	/** Where the deck already has copies, e.g. "2 in main board". */
	inDeck: string;
	/** What a click does, spoken. */
	actionLabel: string;
	disabled: boolean;
};

/** Everything the card editor knows and does, whichever way it shows the printings. */
export type ManagePrintingsManager = {
	target: ManagePrintingsProps['target'];
	onClose: () => void;
	/** The printings listed on the deck side, in their order. */
	rows: string[];
	boardTotals: BoardCounts;
	summary: string;
	saving: boolean;
	saveError: string | null;
	view: 'deck' | 'all';
	replacingUuid: string | null;
	replacing: PrintingInfo | undefined;
	replacingCount: number;
	addBoard: DeckBoard;
	setAddBoard: (board: DeckBoard) => void;
	query: string;
	setQuery: (query: string) => void;
	/** Printings on the "all" side, sorted and matching the search, less the one being replaced. */
	choices: CardPrinting[];
	/** Printings the deck had when the editor opened. */
	initial: ReadonlyMap<string, BoardCounts>;
	countsOf: (uuid: string) => BoardCounts;
	ownedOf: (uuid: string) => number;
	/** A deck row's printing, keeping the label it opened with. */
	rowPrinting: (uuid: string) => PrintingInfo;
	choiceOf: (uuid: string) => PrintingChoice;
	setCount: (uuid: string, board: DeckBoard, count: number) => void;
	moveCopies: (uuid: string, from: DeckBoard, count: number) => void;
	moveAll: (from: DeckBoard) => void;
	startAdding: () => void;
	startReplacing: (uuid: string) => void;
	stopChoosingPrinting: () => void;
	/** A click on a printing on the "all" side: replaces, or adds a copy. */
	choose: (uuid: string) => void;
};

/**
 * The card editor's state and steps: counts shown on top of unsaved steps, the
 * deck rows' order, the chosen board and search, and replacing a whole row.
 * `printings` are what the "all printings" side may offer.
 */
export function useManagePrintings(
	props: ManagePrintingsProps,
	printings: readonly CardPrinting[]
): ManagePrintingsManager {
	const { target, cards, onSteps, onClose } = props;
	const ownership = useAppSelector(selectOwnership);
	/** Copies of a printing the owned collections hold. */
	function ownedOf(uuid: string): number {
		return ownership?.byUuid[uuid]?.owned ?? 0;
	}
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
		Array.from(initial.keys()).sort(
			(a, b) =>
				Number(initial.get(b)![target.board] > 0) -
				Number(initial.get(a)![target.board] > 0)
		)
	);
	// The board a click in the printings grid adds to.
	const [addBoard, setAddBoard] = useState<DeckBoard>(target.board);
	const [query, setQuery] = useState('');
	const [view, setView] = useState<'deck' | 'all'>('deck');
	const [replacingUuid, setReplacingUuid] = useState<string | null>(null);
	const [saveError, setSaveError] = useState<string | null>(null);
	const saving = pending.length > 0;

	useCloseOnEscape(onClose);

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
				number: deckInfo.get(printing.uuid)?.number ?? null,
				image: printing.image ?? printing.art ?? undefined
			});
		for (const [uuid, printing] of deckInfo)
			if (!byUuid.has(uuid)) byUuid.set(uuid, printing);
		for (const card of cards)
			if (!byUuid.has(card.uuid))
				byUuid.set(card.uuid, deckCardInfo(card));
		return byUuid;
	}, [printings, deckInfo, cards]);

	// The deck's own printings come first, since a set can have several of the card.
	const sorted = useMemo(() => {
		const needle = query.trim().toLowerCase();
		return printings
			.toSorted(
				(a, b) =>
					Number(initial.has(b.uuid)) - Number(initial.has(a.uuid)) ||
					(ownership?.byUuid[b.uuid]?.owned ?? 0) -
						(ownership?.byUuid[a.uuid]?.owned ?? 0)
			)
			.filter(
				(printing) =>
					!needle ||
					printing.setCode.toLowerCase().includes(needle) ||
					!!printing.setName?.toLowerCase().includes(needle)
			);
	}, [printings, query, initial, ownership]);
	const choices = replacingUuid
		? sorted.filter((choice) => choice.uuid !== replacingUuid)
		: sorted;

	function countsOf(uuid: string): BoardCounts {
		return countsIn(counts, uuid);
	}
	// Printings that joined elsewhere, such as on another device, follow the opening ones.
	const rows = order
		.concat(Array.from(counts.keys()).filter((uuid) => !order.includes(uuid)))
		.filter((uuid) => totalOf(countsOf(uuid)) > 0);
	const boardTotals: BoardCounts = {
		main: rows.reduce((sum, uuid) => sum + countsOf(uuid).main, 0),
		side: rows.reduce((sum, uuid) => sum + countsOf(uuid).side, 0)
	};

	/** Shows `steps` at once and saves them; they stay shown until the store has them. */
	function take(steps: DeckCardStep[]) {
		if (steps.length === 0) return;
		const entry = { id: nextPendingId++, steps };
		setPending((previous) => previous.concat([entry]));
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
					return previous.concat([joined]);
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

	function startAdding() {
		setReplacingUuid(null);
		setView('all');
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

	const replacing = replacingUuid ? info.get(replacingUuid) : undefined;
	const replacingCount = replacingUuid ? totalOf(countsOf(replacingUuid)) : 0;

	function rowPrinting(uuid: string): PrintingInfo {
		return deckInfo.get(uuid) ?? info.get(uuid)!;
	}

	function choiceOf(uuid: string): PrintingChoice {
		const printing = info.get(uuid)!;
		const choiceCounts = countsOf(uuid);
		const count = choiceCounts[addBoard];
		const label = `${printing.name}, ${setNameOf(printing)}`;
		const inDeck = DECK_BOARD_ORDER.filter((board) => choiceCounts[board] > 0)
			.map((board) => `${choiceCounts[board]} in ${boardName(board)}`)
			.join(', ');
		return {
			uuid,
			printing,
			counts: choiceCounts,
			count,
			label,
			inDeck,
			actionLabel: replacing
				? `Change all ${copies(replacingCount)} to ${label}${inDeck ? `, ${inDeck} already` : ''}`
				: `Add a ${label} copy to the ${boardName(addBoard)}${inDeck ? `, ${inDeck}` : ''}`,
			disabled: replacingUuid
				? !canReplace(replacingUuid, uuid)
				: count >= MAX_COPIES
		};
	}

	function choose(uuid: string) {
		if (replacingUuid) replaceAllCopies(replacingUuid, uuid);
		else setCount(uuid, addBoard, countsOf(uuid)[addBoard] + 1);
	}

	return {
		target,
		onClose,
		rows,
		boardTotals,
		summary: `${boardTotals.main} main · ${boardTotals.side} side`,
		saving,
		saveError,
		view,
		replacingUuid,
		replacing,
		replacingCount,
		addBoard,
		setAddBoard,
		query,
		setQuery,
		choices,
		initial,
		countsOf,
		ownedOf,
		rowPrinting,
		choiceOf,
		setCount,
		moveCopies,
		moveAll,
		startAdding,
		startReplacing,
		stopChoosingPrinting,
		choose
	};
}
