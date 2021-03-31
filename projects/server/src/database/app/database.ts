import { Sequelize } from 'sequelize';
import { DefineDeckModel, Deck } from './tables/deck';
import { DefineDeckCardModel, DeckCard } from './tables/deck-card';
import { User, DefineUserModel } from './tables/user';

export type CardInfo = {
	name: string;
	uuid: string;
	scryfallId: string;
};

export class Database {
	private db: Sequelize;

	public Deck: typeof Deck;
	public DeckCard: typeof DeckCard;
	public User: typeof User;

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

		this.User = DefineUserModel(this.db);
		this.Deck = DefineDeckModel(this.db);
		this.DeckCard = DefineDeckCardModel(this.db, this.Deck);
	}

	public async initialize() {
		const tables = [this.Deck, this.DeckCard, this.User];

		for (const table of tables) {
			await table.sync({ force: false });
		}
	}
}
