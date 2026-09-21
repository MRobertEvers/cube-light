// TypeScript 4.2 predates the node:sqlite type declarations.
const { DatabaseSync } = require('node:sqlite') as {
	DatabaseSync: new (
		filename: string,
		options: { readOnly: boolean }
	) => {
		prepare(sql: string): { iterate(): IterableIterator<MTGJSONCard> };
		close(): void;
	};
};

export type MTGJSONCard = {
	name: string;
	setCode: string;
	uuid: string;
};

export function* iterAllCards(sqlitePath: string): Generator<MTGJSONCard> {
	const database = new DatabaseSync(sqlitePath, { readOnly: true });
	try {
		for (const card of database.prepare('SELECT name, setCode, uuid FROM cards ORDER BY rowid').iterate()) {
			yield card;
		}
	} finally {
		database.close();
	}
}
