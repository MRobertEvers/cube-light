import { Sequelize } from 'sequelize';
import { DefineDeckModel, Deck } from './tables/deck';
import { DefineDeckCardModel, DeckCard } from './tables/deck-card';

export type CardInfo = {
	name: string;
	uuid: string;
	scryfallId: string;
};

export class Database {
	private db: Sequelize;

	public Deck: typeof Deck;
	public DeckCard: typeof DeckCard;

	public static async createDatabase(sqlite: string) {
		const db = new Database(sqlite);

		await db.initialize();

		return db;
	}

	private constructor(sqlite: string) {
		// this.sqlite = sqlite;

		this.db = new Sequelize({
			dialect: 'sqlite',
			storage: sqlite ///'../../assets/AllPrintings.sqlite'
		});

		this.Deck = DefineDeckModel(this.db);
		this.DeckCard = DefineDeckCardModel(this.db, this.Deck);
	}

	private async initialize() {
		const tables = [this.Deck, this.DeckCard];

		for (const table of tables) {
			await table.sync({ force: false, alter: true });
		}

		if (
			!(await this.Deck.findOne({
				where: {
					Name: 'Mono Blue'
				}
			}))
		)
			await this.Deck.upsert({
				Name: 'Mono Blue'
			});
	}

	public async queryCardsByName(name: string): Promise<CardInfo[]> {
		const query = this.db.query(
			`SELECT name, uuid, scryfallId  FROM cards WHERE name='${name}'`
		) as Promise<[CardInfo[], any]>;
		const [result] = await query;

		return result;
	}
}
