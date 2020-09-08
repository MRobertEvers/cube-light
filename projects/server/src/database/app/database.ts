import { Sequelize } from 'sequelize';
import { DefineDeckModel, Deck } from './tables/deck';
import { DefineDeckCardModel, DeckCard } from './tables/deck-card';

type CardInfo = {
	name: string;
	uuid: string;
	scryfallId: string;
};

export class Database {
	private db: Sequelize;

	public Deck: typeof Deck;
	public DeckCard: typeof DeckCard;

	constructor(sqlite: string) {
		// this.sqlite = sqlite;

		this.db = new Sequelize({
			dialect: 'sqlite',
			storage: sqlite ///'../../assets/AllPrintings.sqlite'
		});

		this.Deck = DefineDeckModel(this.db);
		this.DeckCard = DefineDeckCardModel(this.db, this.Deck);

		this.Deck.upsert(<Deck>{
			Name: 'Base Deck'
		});
	}

	public async queryCardsByName(name: string): Promise<CardInfo[]> {
		const query = this.db.query(`SELECT name, uuid, scryfallId  FROM cards WHERE name='${name}'`) as Promise<
			[CardInfo[], any]
		>;
		const [result] = await query;

		return result;
	}
}
