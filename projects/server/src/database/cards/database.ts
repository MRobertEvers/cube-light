import { Sequelize } from 'sequelize';
const CARD_DATABASE_KEYS = ['name', 'uuid', 'scryfallId', 'types', 'manaCost'];
const CARD_DATABASE_COLUMNS = CARD_DATABASE_KEYS.join(',');
// 'Enchantment' | 'Creature' | 'Instant' | 'Sorcery' | 'Artifact' | 'Planeswalker' | 'Land'
export type CardInfo = {
	name: string;
	uuid: string;
	scryfallId: string;
	types: string; // Comma separated types above.
	manaCost: string; // {X}{W}
};

export class CardDatabase {
	private db: Sequelize;

	constructor(sqlite: string) {
		this.db = new Sequelize({
			dialect: 'sqlite',
			storage: sqlite
		});
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
			`SELECT ${CARD_DATABASE_COLUMNS} FROM cards WHERE scryfallId COLLATE NOCASE IN (:uuids)`,
			{
				replacements: { uuids: uuids }
			}
		) as Promise<[CardInfo[], any]>;

		const [result] = await query;

		return result;
	}
}
