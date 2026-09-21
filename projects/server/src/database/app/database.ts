import { SqliteDatabase, SqliteTransaction, placeholders } from '../sqlite';
import { createPublicId, PublicIdKind } from './public-id';

export type Deck = {
	DeckId: number;
	PublicId: string;
	Name: string;
	Art: string | null;
	BannerCardUuid: string | null;
	PaletteJson: string | null;
	BannerCropJson: string | null;
	TopStyle: 'card' | 'full-art';
	CreatedAt: string;
	UpdatedAt: string;
};

export type DeckCard = {
	DeckCardId: number;
	DeckId: number;
	Uuid: string;
	Count: number;
};

export type DeckBannerBlend = { ConfigJson: string; SourceArt: string | null; CropJson: string | null; Revision: string };

export type DeckCardChange = { uuid: string; count: number };
export type DeckCardEdit = DeckCardChange & { action: 'add' | 'remove' | 'set' };
export type DeckDetailChange = {
	field: 'name' | 'bannerCardUuid' | 'art' | 'palette' | 'bannerCrop' | 'topStyle' | 'bannerBlend';
	before: string | null;
	after: string | null;
};
export type DeckEdit = {
	id: number;
	createdAt: string;
	cardsIn: DeckCardChange[];
	cardsOut: DeckCardChange[];
	details: DeckDetailChange[];
};

type DeckEditRow = { DeckEditId: number; CreatedAt: string };
type DeckEditCardRow = { DeckEditId: number; Uuid: string; Direction: string; Count: number };
type DeckEditDetailRow = { DeckEditId: number; Field: DeckDetailChange['field']; BeforeValue: string | null; AfterValue: string | null };

export type Collection = { CollectionId: number; PublicId: string; Name: string };
export type StorageLocation = { StorageLocationId: number; PublicId: string; Name: string };

function timestamp(): string {
	return new Date().toISOString();
}

export class Database {
	private constructor(private readonly db: SqliteDatabase) {}

	static async Sqlite(filepath: string): Promise<Database> {
		const db = new SqliteDatabase(filepath);
		const database = new Database(db);
		try {
			await database.initialize();
			return database;
		} catch (error) {
			await db.close();
			throw error;
		}
	}

	private async initialize(): Promise<void> {
		await this.db.exec(`
			PRAGMA foreign_keys = ON;
			CREATE TABLE IF NOT EXISTS Decks (
				DeckId INTEGER PRIMARY KEY AUTOINCREMENT,
				Name VARCHAR(1024) NOT NULL,
				Art VARCHAR(1024),
				BannerCardUuid VARCHAR(128),
				PaletteJson TEXT,
				BannerCropJson TEXT,
				TopStyle TEXT NOT NULL DEFAULT 'card',
				Owner INTEGER,
				CreatedAt DATETIME NOT NULL,
				UpdatedAt DATETIME NOT NULL
			);
			CREATE TABLE IF NOT EXISTS Deck_Cards (
				DeckCardId INTEGER PRIMARY KEY AUTOINCREMENT,
				DeckId VARCHAR(1024) REFERENCES Decks(DeckId) ON DELETE CASCADE ON UPDATE CASCADE,
				Uuid VARCHAR(128),
				Count INTEGER DEFAULT 1
			);
			CREATE TABLE IF NOT EXISTS DeckBannerBlends (
				DeckId INTEGER PRIMARY KEY REFERENCES Decks(DeckId) ON DELETE CASCADE,
				ConfigJson TEXT NOT NULL, SourceArt TEXT, CropJson TEXT, Revision TEXT NOT NULL,
				DesktopImage BLOB NOT NULL, MobileImage BLOB NOT NULL, TileImage BLOB NOT NULL, HistoryJson TEXT
			);
			CREATE TABLE IF NOT EXISTS DeckEdits (
				DeckEditId INTEGER PRIMARY KEY AUTOINCREMENT,
				DeckId INTEGER NOT NULL REFERENCES Decks(DeckId) ON DELETE CASCADE,
				CreatedAt DATETIME NOT NULL
			);
			CREATE INDEX IF NOT EXISTS DeckEdits_DeckId ON DeckEdits (DeckId, DeckEditId DESC);
			CREATE TABLE IF NOT EXISTS DeckEditCards (
				DeckEditId INTEGER NOT NULL REFERENCES DeckEdits(DeckEditId) ON DELETE CASCADE,
				Uuid VARCHAR(128) NOT NULL,
				Direction VARCHAR(3) NOT NULL CHECK (Direction IN ('in', 'out')),
				Count INTEGER NOT NULL CHECK (Count > 0)
			);
			CREATE TABLE IF NOT EXISTS DeckEditDetails (
				DeckEditId INTEGER NOT NULL REFERENCES DeckEdits(DeckEditId) ON DELETE CASCADE,
				Field VARCHAR(32) NOT NULL,
				BeforeValue TEXT,
				AfterValue TEXT
			);
			CREATE TABLE IF NOT EXISTS Users (
				UserId INTEGER PRIMARY KEY AUTOINCREMENT,
				Name VARCHAR(1024),
				CreatedAt DATETIME NOT NULL,
				UpdatedAt DATETIME NOT NULL
			);
			CREATE TABLE IF NOT EXISTS StorageLocations (
				StorageLocationId INTEGER PRIMARY KEY AUTOINCREMENT,
				Name VARCHAR(1024) NOT NULL,
				CreatedAt DATETIME NOT NULL,
				UpdatedAt DATETIME NOT NULL
			);
			CREATE TABLE IF NOT EXISTS Collections (
				CollectionId INTEGER PRIMARY KEY AUTOINCREMENT,
				Name VARCHAR(1024) NOT NULL,
				CreatedAt DATETIME NOT NULL,
				UpdatedAt DATETIME NOT NULL
			);
			CREATE TABLE IF NOT EXISTS Collection_Cards (
				CollectionCardId INTEGER PRIMARY KEY AUTOINCREMENT,
				StorageLocationId INTEGER REFERENCES StorageLocations(StorageLocationId) ON DELETE CASCADE ON UPDATE CASCADE,
				CollectionId INTEGER REFERENCES Collections(CollectionId) ON DELETE CASCADE ON UPDATE CASCADE,
				Uuid VARCHAR(128),
				Count INTEGER DEFAULT 1,
				CreatedAt DATETIME NOT NULL,
				UpdatedAt DATETIME NOT NULL
			);
		`);
		const columns = await this.db.all<{ name: string }>('PRAGMA table_info(Decks)');
		if (!columns.some((column) => column.name === 'BannerCardUuid')) {
			await this.db.exec('ALTER TABLE Decks ADD COLUMN BannerCardUuid VARCHAR(128)');
		}
		if (!columns.some((column) => column.name === 'PaletteJson')) {
			await this.db.exec('ALTER TABLE Decks ADD COLUMN PaletteJson TEXT');
		}
		if (!columns.some((column) => column.name === 'BannerCropJson')) {
			await this.db.exec('ALTER TABLE Decks ADD COLUMN BannerCropJson TEXT');
		}
		if (!columns.some((column) => column.name === 'TopStyle')) {
			await this.db.exec("ALTER TABLE Decks ADD COLUMN TopStyle TEXT NOT NULL DEFAULT 'card'");
		}
		// Additive: existing blend rows and their images stay valid; HistoryJson is only a compact edit-log value.
		const blendColumns = await this.db.all<{ name: string }>('PRAGMA table_info(DeckBannerBlends)');
		if (!blendColumns.some((column) => column.name === 'HistoryJson')) {
			await this.db.exec('ALTER TABLE DeckBannerBlends ADD COLUMN HistoryJson TEXT');
		}
		await this.ensurePublicIds('Decks', 'DeckId', 'deck');
		await this.ensurePublicIds('Collections', 'CollectionId', 'collection');
		await this.ensurePublicIds('StorageLocations', 'StorageLocationId', 'location');
	}

	private async ensurePublicIds(table: string, rowId: string, kind: PublicIdKind): Promise<void> {
		const columns = await this.db.all<{ name: string }>(`PRAGMA table_info(${table})`);
		if (!columns.some((column) => column.name === 'PublicId')) {
			await this.db.exec(`ALTER TABLE ${table} ADD COLUMN PublicId TEXT`);
		}
		this.db.transaction((tx) => {
			const used = new Set(tx.all<{ PublicId: string }>(`SELECT PublicId FROM ${table} WHERE PublicId IS NOT NULL`)
				.map((row) => row.PublicId));
			const missing = tx.all<{ id: number }>(`SELECT ${rowId} AS id FROM ${table} WHERE PublicId IS NULL`);
			for (const row of missing) {
				let publicId: string;
				do { publicId = createPublicId(kind); } while (used.has(publicId));
				used.add(publicId);
				tx.run(`UPDATE ${table} SET PublicId = ? WHERE ${rowId} = ?`, [publicId, row.id]);
			}
		});
		await this.db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS ${table}_PublicId ON ${table} (PublicId)`);
	}

	private async insertWithPublicId(table: string, kind: PublicIdKind, name: string): Promise<number> {
		const now = timestamp();
		for (let attempt = 0; attempt < 5; attempt++) {
			try {
				const result = await this.db.run(
					`INSERT INTO ${table} (PublicId, Name, CreatedAt, UpdatedAt) VALUES (?, ?, ?, ?)`,
					[createPublicId(kind), name, now, now]
				);
				return result.lastID;
			} catch (error) {
				if (!String(error).includes(`UNIQUE constraint failed: ${table}.PublicId`)) throw error;
			}
		}
		throw new Error(`Could not allocate a unique ${kind} ID`);
	}

	close(): Promise<void> {
		return this.db.close();
	}

	async createDeck(name: string): Promise<number> {
		return this.insertWithPublicId('Decks', 'deck', name);
	}

	listDecks(start: number, limit: number): Promise<Deck[]> {
		return this.db.all<Deck>(
			'SELECT DeckId, PublicId, Name, Art, BannerCardUuid, PaletteJson, BannerCropJson, TopStyle, CreatedAt, UpdatedAt FROM Decks ORDER BY DeckId LIMIT ? OFFSET ?',
			[limit, start]
		);
	}

	getDeck(id: string): Promise<Deck | undefined> {
		return this.db.get<Deck>('SELECT DeckId, PublicId, Name, Art, BannerCardUuid, PaletteJson, BannerCropJson, TopStyle, CreatedAt, UpdatedAt FROM Decks WHERE DeckId = ?', [id]);
	}

	getDeckByPublicId(id: string): Promise<Deck | undefined> {
		return this.db.get<Deck>(
			'SELECT DeckId, PublicId, Name, Art, BannerCardUuid, PaletteJson, BannerCropJson, TopStyle, CreatedAt, UpdatedAt FROM Decks WHERE PublicId = ?',
			[id]
		);
	}

	getDeckCards(id: string): Promise<DeckCard[]> {
		return this.db.all<DeckCard>(
			'SELECT DeckCardId, DeckId, Uuid, Count FROM Deck_Cards WHERE DeckId = ?',
			[id]
		);
	}

	async getDeckEditHistory(id: string): Promise<DeckEdit[]> {
		const edits = await this.db.all<DeckEditRow>(
			'SELECT DeckEditId, CreatedAt FROM DeckEdits WHERE DeckId = ? ORDER BY DeckEditId DESC',
			[id]
		);
		if (edits.length === 0) return [];
		const changes = await this.db.all<DeckEditCardRow>(
			`SELECT c.DeckEditId, c.Uuid, c.Direction, c.Count
			 FROM DeckEditCards c JOIN DeckEdits e ON e.DeckEditId = c.DeckEditId
			 WHERE e.DeckId = ? ORDER BY c.rowid`,
			[id]
		);
		const details = await this.db.all<DeckEditDetailRow>(
			`SELECT d.DeckEditId, d.Field, d.BeforeValue, d.AfterValue
			 FROM DeckEditDetails d JOIN DeckEdits e ON e.DeckEditId = d.DeckEditId
			 WHERE e.DeckId = ? ORDER BY d.rowid`,
			[id]
		);
		const history = edits.map((edit) => ({
			id: edit.DeckEditId,
			createdAt: edit.CreatedAt,
			cardsIn: [] as DeckCardChange[],
			cardsOut: [] as DeckCardChange[],
			details: [] as DeckDetailChange[]
		}));
		const byId = new Map(history.map((edit) => [edit.id, edit]));
		for (const change of changes) {
			const edit = byId.get(change.DeckEditId);
			if (!edit) continue;
			const card = { uuid: change.Uuid, count: change.Count };
			if (change.Direction === 'in') edit.cardsIn.push(card);
			else edit.cardsOut.push(card);
		}
		for (const detail of details) {
			byId.get(detail.DeckEditId)?.details.push({
				field: detail.Field,
				before: detail.BeforeValue,
				after: detail.AfterValue
			});
		}
		return history;
	}

	applyDeckCardEdit(deckId: string, edits: DeckCardEdit[]): DeckEdit | null {
		return this.db.transaction((tx) => {
			const changes = new Map<string, number>();
			for (const edit of edits) {
				const rows = tx.all<DeckCard>(
					'SELECT DeckCardId, DeckId, Uuid, Count FROM Deck_Cards WHERE DeckId = ? AND Uuid = ?',
					[deckId, edit.uuid]
				);
				const before = rows.reduce((total, row) => total + row.Count, 0);
				const after = edit.action === 'set'
					? edit.count
					: edit.action === 'add'
						? before + edit.count
						: Math.max(0, before - edit.count);
				if (after === before) continue;
				if (after === 0) {
					tx.run('DELETE FROM Deck_Cards WHERE DeckId = ? AND Uuid = ?', [deckId, edit.uuid]);
				} else if (rows.length === 0) {
					tx.run('INSERT INTO Deck_Cards (DeckId, Uuid, Count) VALUES (?, ?, ?)', [deckId, edit.uuid, after]);
				} else {
					tx.run('UPDATE Deck_Cards SET Count = ? WHERE DeckCardId = ?', [after, rows[0].DeckCardId]);
					for (const row of rows.slice(1)) {
						tx.run('DELETE FROM Deck_Cards WHERE DeckCardId = ?', [row.DeckCardId]);
					}
				}
				changes.set(edit.uuid, (changes.get(edit.uuid) || 0) + after - before);
			}

			const cardsIn: DeckCardChange[] = [];
			const cardsOut: DeckCardChange[] = [];
			for (const [uuid, delta] of changes) {
				if (delta > 0) cardsIn.push({ uuid, count: delta });
				if (delta < 0) cardsOut.push({ uuid, count: -delta });
			}
			if (cardsIn.length === 0 && cardsOut.length === 0) return null;

			const createdAt = timestamp();
			const { lastID } = tx.run('INSERT INTO DeckEdits (DeckId, CreatedAt) VALUES (?, ?)', [deckId, createdAt]);
			for (const card of cardsIn) {
				tx.run('INSERT INTO DeckEditCards (DeckEditId, Uuid, Direction, Count) VALUES (?, ?, ?, ?)',
					[lastID, card.uuid, 'in', card.count]);
			}
			for (const card of cardsOut) {
				tx.run('INSERT INTO DeckEditCards (DeckEditId, Uuid, Direction, Count) VALUES (?, ?, ?, ?)',
					[lastID, card.uuid, 'out', card.count]);
			}
			tx.run('UPDATE Decks SET UpdatedAt = ? WHERE DeckId = ?', [createdAt, deckId]);
			return { id: lastID, createdAt, cardsIn, cardsOut, details: [] };
		});
	}

	private recordDeckDetailEdit(tx: SqliteTransaction, deckId: string, details: DeckDetailChange[]): void {
		if (details.length === 0) return;
		const createdAt = timestamp();
		const { lastID } = tx.run('INSERT INTO DeckEdits (DeckId, CreatedAt) VALUES (?, ?)', [deckId, createdAt]);
		for (const detail of details) {
			tx.run(
				'INSERT INTO DeckEditDetails (DeckEditId, Field, BeforeValue, AfterValue) VALUES (?, ?, ?, ?)',
				[lastID, detail.field, detail.before, detail.after]
			);
		}
		tx.run('UPDATE Decks SET UpdatedAt = ? WHERE DeckId = ?', [createdAt, deckId]);
	}

	async deleteDeck(id: string): Promise<void> {
		await this.db.run('DELETE FROM Decks WHERE DeckId = ?', [id]);
	}

	async setDeckArt(id: number, art: string, bannerCardUuid: string): Promise<void> {
		await this.db.run('UPDATE Decks SET Art = ?, BannerCardUuid = ?, UpdatedAt = ? WHERE DeckId = ?', [art, bannerCardUuid, timestamp(), id]);
	}

	async updateDeckDetails(id: string, name: string, art?: string, bannerCardUuid?: string): Promise<void> {
		this.db.transaction((tx) => {
			const deck = tx.get<Deck>('SELECT Name, Art, BannerCardUuid, BannerCropJson FROM Decks WHERE DeckId = ?', [id]);
			if (!deck) return;
			const nextArt = art ?? deck.Art;
			const nextBanner = bannerCardUuid ?? deck.BannerCardUuid;
			const details: DeckDetailChange[] = [];
			if (name !== deck.Name) details.push({ field: 'name', before: deck.Name, after: name });
			if (nextBanner !== deck.BannerCardUuid) {
				details.push({ field: 'bannerCardUuid', before: deck.BannerCardUuid, after: nextBanner });
			}
			if (nextArt !== deck.Art) details.push({ field: 'art', before: deck.Art, after: nextArt });
			const nextCrop = nextBanner === deck.BannerCardUuid ? deck.BannerCropJson : null;
			if (nextCrop !== deck.BannerCropJson) {
				details.push({ field: 'bannerCrop', before: deck.BannerCropJson, after: null });
			}
			if (details.length === 0) return;
			tx.run('UPDATE Decks SET Name = ?, Art = ?, BannerCardUuid = ?, BannerCropJson = ? WHERE DeckId = ?',
				[name, nextArt, nextBanner, nextCrop, id]);
			this.recordDeckDetailEdit(tx, id, details);
		});
	}

	async setDeckPalette(id: string, paletteJson: string | null): Promise<void> {
		this.db.transaction((tx) => {
			const deck = tx.get<Deck>('SELECT PaletteJson FROM Decks WHERE DeckId = ?', [id]);
			if (!deck || deck.PaletteJson === paletteJson) return;
			tx.run('UPDATE Decks SET PaletteJson = ? WHERE DeckId = ?', [paletteJson, id]);
			this.recordDeckDetailEdit(tx, id, [{
				field: 'palette', before: deck.PaletteJson, after: paletteJson
			}]);
		});
	}

	async setDeckBannerCrop(id: string, cropJson: string): Promise<void> {
		this.db.transaction((tx) => {
			const deck = tx.get<Deck>('SELECT BannerCropJson FROM Decks WHERE DeckId = ?', [id]);
			if (!deck || deck.BannerCropJson === cropJson) return;
			tx.run('UPDATE Decks SET BannerCropJson = ? WHERE DeckId = ?', [cropJson, id]);
			this.recordDeckDetailEdit(tx, id, [{
				field: 'bannerCrop', before: deck.BannerCropJson, after: cropJson
			}]);
		});
	}

	async setDeckTopStyle(id: string, topStyle: 'card' | 'full-art'): Promise<void> {
		this.db.transaction((tx) => {
			const deck = tx.get<Deck>('SELECT TopStyle FROM Decks WHERE DeckId = ?', [id]);
			if (!deck || deck.TopStyle === topStyle) return;
			tx.run('UPDATE Decks SET TopStyle = ? WHERE DeckId = ?', [topStyle, id]);
			this.recordDeckDetailEdit(tx, id, [{ field: 'topStyle', before: deck.TopStyle, after: topStyle }]);
		});
	}

	async getDeckBannerBlend(id: string): Promise<DeckBannerBlend | undefined> {
		return this.db.get<DeckBannerBlend>('SELECT ConfigJson, SourceArt, CropJson, Revision FROM DeckBannerBlends WHERE DeckId = ?', [id]);
	}

	async getDeckBannerBlendImage(id: string, variant: 'desktop' | 'mobile' | 'tile', revision: string): Promise<Uint8Array | undefined> {
		const column = { desktop: 'DesktopImage', mobile: 'MobileImage', tile: 'TileImage' }[variant];
		const row = await this.db.get<{ Image: Uint8Array }>(`SELECT ${column} AS Image FROM DeckBannerBlends WHERE DeckId = ? AND Revision = ?`, [id, revision]);
		return row?.Image;
	}

	async setDeckBannerBlend(id: string, expectedArt: string | null, expectedCrop: string | null,
		config: string, revision: string, images: { desktop: Buffer; mobile: Buffer; tile: Buffer }, historyValue = config): Promise<boolean> {
		return this.db.transaction((tx) => {
			const deck = tx.get<Deck>('SELECT Art, BannerCropJson FROM Decks WHERE DeckId = ?', [id]);
			if (!deck || deck.Art !== expectedArt || deck.BannerCropJson !== expectedCrop) return false;
			const previous = tx.get<DeckBannerBlend & { HistoryJson: string | null }>('SELECT ConfigJson, HistoryJson FROM DeckBannerBlends WHERE DeckId = ?', [id]);
			tx.run(`INSERT INTO DeckBannerBlends (DeckId, ConfigJson, SourceArt, CropJson, Revision, DesktopImage, MobileImage, TileImage, HistoryJson)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(DeckId) DO UPDATE SET
				ConfigJson=excluded.ConfigJson, SourceArt=excluded.SourceArt, CropJson=excluded.CropJson, Revision=excluded.Revision,
				DesktopImage=excluded.DesktopImage, MobileImage=excluded.MobileImage, TileImage=excluded.TileImage, HistoryJson=excluded.HistoryJson`,
				[id, config, expectedArt, expectedCrop, revision, images.desktop, images.mobile, images.tile, historyValue]);
			if (previous?.ConfigJson !== config) this.recordDeckDetailEdit(tx, id, [{ field: 'bannerBlend', before: previous ? previous.HistoryJson ?? previous.ConfigJson : null, after: historyValue }]);
			return true;
		});
	}

	findDeckCard(deckId: string, uuid: string): Promise<DeckCard | undefined> {
		return this.db.get<DeckCard>(
			'SELECT DeckCardId, DeckId, Uuid, Count FROM Deck_Cards WHERE DeckId = ? AND Uuid = ? LIMIT 1',
			[deckId, uuid]
		);
	}

	async addDeckCards(deckId: string, cards: Array<{ uuid: string; count: number }>): Promise<void> {
		for (const card of cards) {
			await this.db.run('INSERT INTO Deck_Cards (DeckId, Uuid, Count) VALUES (?, ?, ?)', [
				deckId,
				card.uuid,
				card.count
			]);
		}
	}

	async setDeckCard(deckId: string, uuid: string, count: number, cardId?: number): Promise<void> {
		if (cardId === undefined) {
			await this.db.run('INSERT INTO Deck_Cards (DeckId, Uuid, Count) VALUES (?, ?, ?)', [
				deckId,
				uuid,
				count
			]);
		} else {
			await this.db.run('UPDATE Deck_Cards SET Count = ? WHERE DeckCardId = ?', [count, cardId]);
		}
	}

	async deleteDeckCard(cardId: number): Promise<void> {
		await this.db.run('DELETE FROM Deck_Cards WHERE DeckCardId = ?', [cardId]);
	}

	async removeDeckCards(deckId: string, uuids: string[]): Promise<void> {
		if (uuids.length === 0) return;
		await this.db.run(
			`DELETE FROM Deck_Cards WHERE DeckId = ? AND Uuid IN (${placeholders(uuids)})`,
			[deckId, ...uuids]
		);
	}

	async createCollection(name: string): Promise<number> {
		return this.insertWithPublicId('Collections', 'collection', name);
	}

	listCollections(start: number, limit: number): Promise<Collection[]> {
		return this.db.all<Collection>(
			'SELECT CollectionId, PublicId, Name FROM Collections ORDER BY CollectionId LIMIT ? OFFSET ?',
			[limit, start]
		);
	}

	getCollection(id: number): Promise<Collection | undefined> {
		return this.db.get<Collection>('SELECT CollectionId, PublicId, Name FROM Collections WHERE CollectionId = ?', [id]);
	}

	getCollectionByPublicId(id: string): Promise<Collection | undefined> {
		return this.db.get<Collection>('SELECT CollectionId, PublicId, Name FROM Collections WHERE PublicId = ?', [id]);
	}

	async createStorageLocation(name: string): Promise<number> {
		return this.insertWithPublicId('StorageLocations', 'location', name);
	}

	listStorageLocations(start: number, limit: number): Promise<StorageLocation[]> {
		return this.db.all<StorageLocation>(
			'SELECT StorageLocationId, PublicId, Name FROM StorageLocations ORDER BY StorageLocationId LIMIT ? OFFSET ?',
			[limit, start]
		);
	}

	getStorageLocation(id: number): Promise<StorageLocation | undefined> {
		return this.db.get<StorageLocation>(
			'SELECT StorageLocationId, PublicId, Name FROM StorageLocations WHERE StorageLocationId = ?',
			[id]
		);
	}

	getStorageLocationByPublicId(id: string): Promise<StorageLocation | undefined> {
		return this.db.get<StorageLocation>(
			'SELECT StorageLocationId, PublicId, Name FROM StorageLocations WHERE PublicId = ?',
			[id]
		);
	}
}
