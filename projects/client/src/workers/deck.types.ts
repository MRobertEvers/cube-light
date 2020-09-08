export type GetSuggestionsCommand = {
	type: 'suggest';
	payload: string;
};
export type GetSuggestionsResponse = {
	type: 'suggest';
	sorted: string[];
	set: Set<string>;
};

export type AddCardCommand = {
	type: 'add';
	cardName: string;
};
export type AddCardResponse = {
	type: 'add';
};

export type DeckWorkerCommand = GetSuggestionsCommand | AddCardCommand;
export type DeckWorkerResponse = GetSuggestionsResponse | AddCardResponse;
