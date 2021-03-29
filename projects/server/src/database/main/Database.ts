import { Sequelize } from 'sequelize';
import { Deck, DefineDeckModel } from '../app/tables/deck';
import { DeckCard, DefineDeckCardModel } from '../app/tables/deck-card';

export interface IDatabase {
	Deck: typeof Deck;
	DeckCard: typeof DeckCard;
}

export class Database implements IDatabase {
	private db: Sequelize;

	public Deck: typeof Deck;
	public DeckCard: typeof DeckCard;

	public static async connect(sqlite: string): Promise<Database> {
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

	// public async queryCardsByName(name: string): Promise<CardInfo[]> {
	// 	const query = this.db.query(
	// 		`SELECT name, uuid, scryfallId  FROM cards WHERE name='${name}'`
	// 	) as Promise<[CardInfo[], any]>;
	// 	const [result] = await query;

	// 	return result;
	// }
}
