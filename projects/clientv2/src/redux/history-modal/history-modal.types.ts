export type HistoryModalEntry = {
	scope: string;
	value: unknown;
	parent: HistoryModalEntry | null;
};

export type HistoryModalState = {
	entry: HistoryModalEntry | null;
};

