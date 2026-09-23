import file from 'fs';
import { SqliteDatabase, placeholders } from '../sqlite';

const CARD_DATABASE_COLUMNS =
	'c.name, c.uuid, i.scryfallId, c.types, c.manaCost';
const CARD_DATA_COLUMNS =
	'c.name, c.uuid, i.scryfallId, c.types, c.subtypes, c.manaCost, c.text, c.setCode';
/**
 * The row that stands for a whole card. A multi-face card has one row per face; its adventure,
 * omen, prepared side or back face is a later side and is filed and listed under the first.
 */
const MAIN_FACE = "(c.side IS NULL OR c.side = 'a')";

export type CardInfo = {
	name: string;
	uuid: string;
	scryfallId: string;
	types: string;
	manaCost: string;
};

export type PrintingCardInfo = CardInfo & {
	setCode: string;
	setName: string | null;
};

export type DetailedCardInfo = CardInfo & {
	subtypes: string;
	text: string;
	setCode: string;
};

/** Printed card-face details shown alongside a card preview. */
export type CardRulesInfo = {
	uuid: string;
	type: string | null;
	rarity: string | null;
	power: string | null;
	toughness: string | null;
	loyalty: string | null;
	defense: string | null;
	number: string | null;
	artist: string | null;
	flavorText: string | null;
	legalities: Record<string, string>;
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

	public async getCardUuidsByNames(
		names: string[]
	): Promise<Record<string, string>> {
		if (names.length === 0) return {};
		const result = await this.db.all<{ uuid: string; name: string }>(
			`SELECT c.uuid, c.name FROM cards c WHERE c.name IN (${placeholders(names)}) AND ${MAIN_FACE}`,
			names
		);
		return result.reduce(
			(map, item) => {
				map[item.name] = item.uuid;
				return map;
			},
			{} as Record<string, string>
		);
	}

	public queryCardsByName(name: string): Promise<PrintingCardInfo[]> {
		return this.db.all<PrintingCardInfo>(
			`SELECT c.name, c.uuid, c.setCode, s.name AS setName, i.scryfallId FROM cards c JOIN cardIdentifiers i ON i.uuid = c.uuid LEFT JOIN sets s ON s.code = c.setCode WHERE c.name = ? COLLATE NOCASE AND ${MAIN_FACE} ORDER BY c.rowid`,
			[name]
		);
	}

	public queryCardsByNameStub(nameStub: string): Promise<CardInfo[]> {
		if (nameStub.length < 3) return Promise.resolve([]);
		return this.db.all<CardInfo>(
			`SELECT c.name FROM cards c WHERE c.name COLLATE NOCASE LIKE ? AND ${MAIN_FACE}`,
			[`%${nameStub}%`]
		);
	}

	public async queryAllCardNames(): Promise<string[]> {
		const rows = await this.db.all<{ name: string }>(
			`SELECT DISTINCT c.name FROM cards c WHERE ${MAIN_FACE} ORDER BY c.name COLLATE NOCASE`
		);
		return rows.map((row) => row.name);
	}

	/** A later face's uuid answers with its main face's data, so it is filed as the main face. */
	public queryCardInfo(uuids: string[]): Promise<CardInfo[]> {
		return this.byMainFace(uuids, (lookup) =>
			this.db.all<CardInfo>(
				`SELECT ${CARD_DATABASE_COLUMNS} FROM cards c JOIN cardIdentifiers i ON i.uuid = c.uuid WHERE c.uuid COLLATE NOCASE IN (${placeholders(lookup)})`,
				lookup
			)
		);
	}

	/** A later face's uuid answers with its main face's data, so it is filed as the main face. */
	public getCardDataByUuids(uuids: string[]): Promise<DetailedCardInfo[]> {
		return this.byMainFace(uuids, (lookup) =>
			this.db.all<DetailedCardInfo>(
				`SELECT ${CARD_DATA_COLUMNS} FROM cards c JOIN cardIdentifiers i ON i.uuid = c.uuid WHERE c.uuid COLLATE NOCASE IN (${placeholders(lookup)})`,
				lookup
			)
		);
	}

	/** A later face's uuid answers with its main face's rules. */
	public getCardRulesByUuids(uuids: string[]): Promise<CardRulesInfo[]> {
		return this.byMainFace(uuids, (lookup) => this.queryCardRules(lookup));
	}

	/**
	 * Runs `query` with each later face's uuid swapped for its main face's, then answers under the
	 * uuids asked for. Decks saved before names resolved to main faces can hold later faces.
	 */
	private async byMainFace<T extends { uuid: string }>(
		uuids: string[],
		query: (lookup: string[]) => Promise<T[]>
	): Promise<T[]> {
		if (uuids.length === 0) return [];
		const faces = await this.laterFaces(uuids);
		if (faces.length === 0) return query(uuids);
		const faceUuids = new Set(faces.map((face) => face.uuid.toLowerCase()));
		const lookup = uuids
			.filter((uuid) => !faceUuids.has(uuid.toLowerCase()))
			.concat(faces.map((face) => face.main));
		const asked = new Set(
			uuids
				.map((uuid) => uuid.toLowerCase())
				.filter((uuid) => !faceUuids.has(uuid))
		);
		const rows: T[] = [];
		for (const row of await query(Array.from(new Set(lookup)))) {
			const uuid = row.uuid.toLowerCase();
			if (asked.has(uuid)) rows.push(row);
			for (const face of faces)
				if (face.main.toLowerCase() === uuid)
					rows.push(Object.assign({}, row, { uuid: face.uuid }));
		}
		return rows;
	}

	/** The later faces among `uuids`, each with its card's main face. */
	private async laterFaces(
		uuids: string[]
	): Promise<Array<{ uuid: string; main: string }>> {
		const rows = await this.db.all<{ uuid: string; otherFaceIds: string }>(
			`SELECT c.uuid, c.otherFaceIds FROM cards c WHERE c.uuid COLLATE NOCASE IN (${placeholders(uuids)}) AND NOT ${MAIN_FACE}`,
			uuids
		);
		if (rows.length === 0) return [];
		const otherFaces = rows.map((row) =>
			(row.otherFaceIds ?? '').split(',').map((id) => id.trim())
		);
		const candidates = Array.from(new Set(otherFaces.flat()));
		const mains = new Set(
			(
				await this.db.all<{ uuid: string }>(
					`SELECT c.uuid FROM cards c WHERE c.uuid IN (${placeholders(candidates)}) AND c.side = 'a'`,
					candidates
				)
			).map((row) => row.uuid)
		);
		return rows.flatMap((row, index) => {
			const main = otherFaces[index].find((id) => mains.has(id));
			return main ? [{ uuid: row.uuid, main }] : [];
		});
	}

	private async queryCardRules(uuids: string[]): Promise<CardRulesInfo[]> {
		const cards = await this.db.all<Omit<CardRulesInfo, 'legalities'>>(
			`SELECT uuid, type, rarity, power, toughness, loyalty, defense, number, artist, flavorText FROM cards WHERE uuid COLLATE NOCASE IN (${placeholders(uuids)})`,
			uuids
		);
		const legalityRows = await this.db.all<Record<string, string | null>>(
			`SELECT * FROM cardLegalities WHERE uuid COLLATE NOCASE IN (${placeholders(uuids)})`,
			uuids
		);
		const legalitiesByUuid = new Map<string, Record<string, string>>();
		for (const row of legalityRows) {
			const legalities: Record<string, string> = {};
			for (const [format, status] of Object.entries(row)) {
				if (format === 'uuid') continue;
				if (status) legalities[format] = status;
			}
			legalitiesByUuid.set(row.uuid!, legalities);
		}
		return cards.map((card) => ({
			uuid: card.uuid,
			type: card.type,
			rarity: card.rarity,
			power: card.power,
			toughness: card.toughness,
			loyalty: card.loyalty,
			defense: card.defense,
			number: card.number,
			artist: card.artist,
			flavorText: card.flavorText,
			legalities: legalitiesByUuid.get(card.uuid) ?? {}
		}));
	}

	public async getCardSets(name: string): Promise<Array<[string, string]>> {
		const rows = await this.db.all<{ setCode: string; uuid: string }>(
			`SELECT c.setCode, c.uuid FROM cards c WHERE c.name = ? AND ${MAIN_FACE} ORDER BY c.rowid`,
			[name]
		);
		const bySet = new Map<string, string[]>();
		for (const { setCode, uuid } of rows) {
			if (!bySet.has(setCode)) bySet.set(setCode, []);
			bySet.get(setCode)!.push(uuid);
		}
		const result: Array<[string, string]> = [];
		for (const [setCode, uuids] of bySet) {
			for (const uuid of uuids) {
				result.push([setCode, uuid]);
			}
		}
		return result;
	}
}
