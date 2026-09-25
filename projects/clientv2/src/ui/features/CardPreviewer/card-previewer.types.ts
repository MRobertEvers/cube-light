import type { DeckCardEntry } from '../../../domain/models/deck';

export type CardPreviewerProps = {
	card: DeckCardEntry;
	onClose: () => void;
};

export type CardHoverPreviewProps = {
	card: DeckCardEntry;
};
