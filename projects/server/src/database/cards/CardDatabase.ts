import { Sequelize } from 'sequelize';
import file from 'fs';
import { SetListLookup } from '../../app/create-set-list-lookup';

const CARD_DATABASE_KEYS = ['name', 'uuid', 'scryfallId', 'types', 'manaCost'];
const CARD_DATABASE_COLUMNS = CARD_DATABASE_KEYS.join(',');
// 'Enchantment' | 'Creature' | 'Instant' | 'Sorcery' | 'Artifact' | 'Planeswalker' | 'Land'

const CARD_DATA_KEYS_DETAILED = [
	'name',
	'uuid',
	'scryfallId',
	'types',
	'subtypes',
	'manaCost',
	'text',
	'setCode'
];

export type CardInfo = {
	name: string;
	uuid: string;
	scryfallId: string;
	types: string; // Comma separated types above.
	manaCost: string; // {X}{W}
};

export type DetailedCardInfo = {
	name: string;
	uuid: string;
	scryfallId: string;
	types: string; // Comma separated types above.
	subtypes: string;
	manaCost: string; // {X}{W}
	text: string;
	setCode: string;
};

export class CardDatabase {
	private db: Sequelize;

	private setLookup: SetListLookup;

	constructor(sqlite: string, setLookupPath: string) {
		if (!file.existsSync(sqlite)) {
			throw new Error('CardDatabase SQLite not found!' + sqlite);
		}

		if (!file.existsSync(setLookupPath)) {
			throw new Error('Set Lookup not found!' + setLookupPath);
		}

		this.db = new Sequelize({
			dialect: 'sqlite',
			storage: sqlite
		});

		this.setLookup = JSON.parse(file.readFileSync(setLookupPath).toString());
	}

	public async getCardUuidsByNames(names: string[]): Promise<Record<string, string>> {
		const query = this.db.query(`SELECT uuid, name FROM cards WHERE name IN (?)`, {
			replacements: [names]
		}) as Promise<[Array<{ uuid: string; name: string }>, any]>;
		const [result] = await query;

		return result.reduce((map, item) => {
			map[item.name] = item.uuid;
			return map;
		}, {} as Record<string, string>);
	}

	public async queryCardsByName(name: string): Promise<CardInfo[]> {
		const query = this.db.query(
			`SELECT name, uuid, scryfallId FROM cards WHERE name=? COLLATE NOCASE`,
			{
				replacements: [name.toLowerCase()]
			}
		) as Promise<[CardInfo[], any]>;
		const [result] = await query;

		return result;
	}

	public async queryCardsByNameStub(nameStub: string): Promise<CardInfo[]> {
		if (nameStub.length < 3) {
			return [];
		}

		const query = this.db.query(`SELECT name FROM cards WHERE name COLLATE NOCASE LIKE ?`, {
			replacements: [`%${nameStub.toLowerCase()}%`]
		}) as Promise<[CardInfo[], any]>;
		const [result] = await query;

		return result;
	}

	public async queryCardInfo(uuids: string[]): Promise<CardInfo[]> {
		//Scryfallid
		const query = this.db.query(
			`SELECT ${CARD_DATABASE_COLUMNS} FROM cards WHERE uuid COLLATE NOCASE IN (:uuids)`,
			{
				replacements: { uuids: uuids }
			}
		) as Promise<[CardInfo[], any]>;

		const [result] = await query;

		return result;
	}

	public async getCardDataByUuids(uuids: string[]): Promise<DetailedCardInfo[]> {
		//Scryfallid
		const query = this.db.query(
			`SELECT ${CARD_DATA_KEYS_DETAILED} FROM cards WHERE uuid COLLATE NOCASE IN (:uuids)`,
			{
				replacements: { uuids: uuids }
			}
		) as Promise<[DetailedCardInfo[], any]>;

		const [result] = await query;

		return result;
	}

	// [setCode, uuid]
	public async getCardSets(name: string): Promise<Array<[string, string]>> {
		const result: Array<[string, string]> = [];
		const sets = this.setLookup[name];
		if (!sets) {
			return [];
		}

		for (const [setCode, uuids] of Object.entries(sets)) {
			result.push(...uuids.map((uuid) => [setCode, uuid] as [string, string]));
		}

		return result;
	}
}
