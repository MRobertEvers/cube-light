import { Sequelize } from 'sequelize';
const CARD_DATABASE_KEYS = ['name', 'uuid', 'scryfallId', 'types'];
const CARD_DATABASE_COLUMNS = CARD_DATABASE_KEYS.join(',');
// 'Enchantment' | 'Creature' | 'Instant' | 'Sorcery' | 'Artifact' | 'Planeswalker' | 'Land'
export type CardInfo = {
	name: string;
	uuid: string;
	scryfallId: string;
	types: string; // Comma separated types above.
};

export class CardDatabase {
	private db: Sequelize;

	constructor(sqlite: string) {
		// this.sqlite = sqlite;

		this.db = new Sequelize({
			dialect: 'sqlite',
			storage: sqlite ///'../../assets/AllPrintings.sqlite'
		});
	}

	public async queryCardsByName(name: string): Promise<CardInfo[]> {
		const query = this.db.query(`SELECT name, uuid, scryfallId FROM cards WHERE name=? COLLATE NOCASE`, {
			replacements: [name]
		}) as Promise<[CardInfo[], any]>;
		const [result] = await query;

		return result;
	}

	public async queryCardsByNameStub(nameStub: string): Promise<CardInfo[]> {
		if (nameStub.length < 3) {
			return [];
		}

		const query = this.db.query(`SELECT ${CARD_DATABASE_COLUMNS} FROM cards WHERE name LIKE ? COLLATE NOCASE`, {
			replacements: [`%${nameStub}%`]
		}) as Promise<[CardInfo[], any]>;
		const [result] = await query;

		return result;
	}

	public async queryCardInfo(uuids: string[]): Promise<CardInfo[]> {
		//Scryfallid
		const uuidInString = uuids.map((uuid) => `'${uuid}'`).join(',');
		const query = this.db.query(
			`SELECT ${CARD_DATABASE_COLUMNS} FROM cards WHERE scryfallId IN (${uuidInString})`
		) as Promise<[CardInfo[], any]>;

		const [result] = await query;

		return result;
	}
}
