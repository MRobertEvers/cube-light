import type { CardPrinting } from '../../domain/models/card';

export type BannerPickerState = {
	open: boolean;
	deckId: string | null;
	names: string[];
	deckCardUuids: string[];
	query: string;
	chosenName: string;
	currentName: string;
	selectedUuid: string | null;
	currentUuid: string | null;
	printings: CardPrinting[];
	loading: boolean;
	error: string | null;
	requestId: string | null;
	suggestionsOpen: boolean;
	saving: boolean;
	saveError: string | null;
};

export type OpenBannerPickerPayload = {
	deckId: string;
	names: string[];
	deckCardUuids: string[];
	currentName: string;
	currentUuid: string | null;
};
