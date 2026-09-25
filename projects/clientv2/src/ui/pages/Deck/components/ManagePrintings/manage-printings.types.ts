import type { DeckCardEntry } from '../../../../../domain/models/deck';
import type { DeckCardEditTarget } from '../../../../../domain/deck/group-deck-cards';
import type { DeckCardStep } from '../../../../../domain/deck/card-steps';

export type ManagePrintingsProps = {
	/** The card as the editor opened on it, which fixes its rows' order and labels. */
	target: DeckCardEditTarget;
	/** The deck's printings of the card now, in any board. */
	cards: readonly DeckCardEntry[];
	/** Saves steps at once; settles when the deck in the store includes them. */
	onSteps: (steps: DeckCardStep[]) => Promise<void>;
	onClose: () => void;
};

/** What the editor shows for one printing, wherever it came from. */
export type PrintingInfo = {
	name: string;
	uuid: string;
	setCode: string;
	setName: string | null;
	/** Collector number; only the deck's own rows know it. */
	number: string | null;
	image: string | undefined;
};
