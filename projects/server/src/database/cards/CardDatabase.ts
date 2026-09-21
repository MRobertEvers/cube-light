import file from 'fs';
import { SqliteDatabase, placeholders } from '../sqlite';

const CARD_DATABASE_COLUMNS = 'c.name, c.uuid, i.scryfallId, c.types, c.manaCost';
const CARD_DATA_COLUMNS =
	'c.name, c.uuid, i.scryfallId, c.types, c.subtypes, c.manaCost, c.text, c.setCode';

export type CardInfo = {
	name: string;
	uuid: string;
	scryfallId: string;
	types: string;
	manaCost: string;
};

export type PrintingCardInfo = CardInfo & { setCode: string };

export type DetailedCardInfo = CardInfo & {
	subtypes: string;
	text: string;
	setCode: string;
};

export class CardDatabase {
	private db: SqliteDatabase;

	constructor(sqlite: string) {
		if (!file.existsSync(sqlite)) {
			throw new Error('CardDatabase SQLite not found!' + sqlite);
		}

		this.db = new SqliteDatabase(sqlite, true);
	}

	public close(): Promise<void> {
		return this.db.close();
	}

	public async getCardUuidsByNames(names: string[]): Promise<Record<string, string>> {
		if (names.length === 0) return {};
		const result = await this.db.all<{ uuid: string; name: string }>(
			`SELECT uuid, name FROM cards WHERE name IN (${placeholders(names)})`,
			names
		);
		return result.reduce((map, item) => {
			map[item.name] = item.uuid;
			return map;
		}, {} as Record<string, string>);
	}

	public queryCardsByName(name: string): Promise<PrintingCardInfo[]> {
		return this.db.all<PrintingCardInfo>(
			'SELECT c.name, c.uuid, c.setCode, i.scryfallId FROM cards c JOIN cardIdentifiers i ON i.uuid = c.uuid WHERE c.name = ? COLLATE NOCASE ORDER BY c.rowid',
			[name]
		);
	}

	public queryCardsByNameStub(nameStub: string): Promise<CardInfo[]> {
		if (nameStub.length < 3) return Promise.resolve([]);
		return this.db.all<CardInfo>('SELECT name FROM cards WHERE name COLLATE NOCASE LIKE ?', [
			`%${nameStub}%`
		]);
	}

	public async queryAllCardNames(): Promise<string[]> {
		const rows = await this.db.all<{ name: string }>(
			'SELECT DISTINCT name FROM cards ORDER BY name COLLATE NOCASE'
		);
		return rows.map((row) => row.name);
	}

	public queryCardInfo(uuids: string[]): Promise<CardInfo[]> {
		if (uuids.length === 0) return Promise.resolve([]);
		return this.db.all<CardInfo>(
			`SELECT ${CARD_DATABASE_COLUMNS} FROM cards c JOIN cardIdentifiers i ON i.uuid = c.uuid WHERE c.uuid COLLATE NOCASE IN (${placeholders(uuids)})`,
			uuids
		);
	}

	public getCardDataByUuids(uuids: string[]): Promise<DetailedCardInfo[]> {
		if (uuids.length === 0) return Promise.resolve([]);
		return this.db.all<DetailedCardInfo>(
			`SELECT ${CARD_DATA_COLUMNS} FROM cards c JOIN cardIdentifiers i ON i.uuid = c.uuid WHERE c.uuid COLLATE NOCASE IN (${placeholders(uuids)})`,
			uuids
		);
	}

	public async getCardSets(name: string): Promise<Array<[string, string]>> {
		const rows = await this.db.all<{ setCode: string; uuid: string }>(
			'SELECT setCode, uuid FROM cards WHERE name = ? ORDER BY rowid',
			[name]
		);
		const bySet = new Map<string, string[]>();
		for (const { setCode, uuid } of rows) {
			if (!bySet.has(setCode)) bySet.set(setCode, []);
			bySet.get(setCode)!.push(uuid);
		}
		const result: Array<[string, string]> = [];
		for (const [setCode, uuids] of bySet) {
			result.push(...uuids.map((uuid) => [setCode, uuid] as [string, string]));
		}
		return result;
	}
}
