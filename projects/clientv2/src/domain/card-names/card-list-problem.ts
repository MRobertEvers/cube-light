/** A card line whose name the server will not accept. */
export type CardListProblem = {
	/** 1-based line number. */
	line: number;
	/** The raw line analysed, so stale results can be recognised after edits. */
	lineText: string;
	name: string;
	/** Column range of the name, end exclusive. */
	start: number;
	end: number;
	suggestions: string[];
};
