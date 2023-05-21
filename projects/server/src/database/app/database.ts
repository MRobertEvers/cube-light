import { Sequelize } from 'sequelize';
import { DefineDeckModel, Deck } from './tables/deck';
import { DefineDeckCardModel, DeckCard } from './tables/deck_card';
import { User, DefineUserModel } from './tables/user';
import { StorageLocation, DefineStorageLocationModel } from './tables/storage-location';
import { Collection, DefineCollectionModel } from './tables/collection';
import { CollectionCard, DefineCollectionCardModel } from './tables/collection_card';

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
	public StorageLocation: typeof StorageLocation;
	public Collection: typeof Collection;
	public CollectionCard: typeof CollectionCard;

	public static async Sqlite(filepath: string) {
		const sqlite = new Sequelize({
			dialect: 'sqlite',
			storage: filepath ///'../../assets/AllPrintings.sqlite'
		});

		const db = new Database(sqlite);

		await db.initialize();

		return db;
	}

	private constructor(sqlize: Sequelize) {
		this.db = sqlize;

		this.User = DefineUserModel(this.db);
		this.Deck = DefineDeckModel(this.db);
		this.DeckCard = DefineDeckCardModel(this.db, this.Deck);
		this.StorageLocation = DefineStorageLocationModel(this.db);
		this.Collection = DefineCollectionModel(this.db);
		this.CollectionCard = DefineCollectionCardModel(
			this.db,
			this.Collection,
			this.StorageLocation
		);
	}

	public async initialize() {
		const tables = [
			this.Deck,
			this.DeckCard,
			this.User,
			this.StorageLocation,
			this.Collection,
			this.CollectionCard
		];

		for (const table of tables) {
			await table.sync({ force: false });
		}
	}
}
