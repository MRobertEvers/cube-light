import { SqliteDatabase } from '../database/sqlite';

export type User = {
	UserId: number;
	Username: string;
	PasswordHash: string;
	ProfileCardName: string | null;
	ProfileCardUuid: string | null;
	ProfileArt: string | null;
	ProfileCropJson: string | null;
};

export type ProfileCrop = { x: number; y: number; zoom: number };
export type UserProfile = {
	cardName: string;
	cardUuid: string;
	art: string;
	crop: ProfileCrop;
};
export type PublicUser = {
	id: number;
	username: string;
	profile: UserProfile | null;
};

export const USERNAME = /^[A-Za-z0-9_.@-]{3,64}$/;

function isProfileCrop(value: unknown): value is ProfileCrop {
	if (!value || typeof value !== 'object') return false;
	const crop = value as Partial<ProfileCrop>;
	return (
		typeof crop.x === 'number' &&
		Number.isFinite(crop.x) &&
		crop.x >= 0 &&
		crop.x <= 1 &&
		typeof crop.y === 'number' &&
		Number.isFinite(crop.y) &&
		crop.y >= 0 &&
		crop.y <= 1 &&
		typeof crop.zoom === 'number' &&
		Number.isFinite(crop.zoom) &&
		crop.zoom >= 1 &&
		crop.zoom <= 3
	);
}

export function publicUser(
	user: Pick<
		User,
		| 'UserId'
		| 'Username'
		| 'ProfileCardName'
		| 'ProfileCardUuid'
		| 'ProfileArt'
		| 'ProfileCropJson'
	>
): PublicUser {
	let profile: UserProfile | null = null;
	try {
		const storedCrop: unknown = user.ProfileCropJson
			? JSON.parse(user.ProfileCropJson)
			: null;
		const crop = isProfileCrop(storedCrop) ? storedCrop : null;
		if (
			user.ProfileCardName &&
			user.ProfileCardUuid &&
			user.ProfileArt &&
			crop
		)
			profile = {
				cardName: user.ProfileCardName,
				cardUuid: user.ProfileCardUuid,
				art: user.ProfileArt,
				crop
			};
	} catch {
		/* Treat an old or malformed saved profile as unset. */
	}
	return { id: user.UserId, username: user.Username, profile };
}

function timestamp(): string {
	return new Date().toISOString();
}

/**
 * Accounts in the app database's Users table. Usernames compare case-insensitively.
 * Only rows with a password hash can sign in.
 */
export class UserStore {
	private constructor(private readonly db: SqliteDatabase) {}

	static async Sqlite(filepath: string): Promise<UserStore> {
		const store = new UserStore(new SqliteDatabase(filepath));
		await store.initialize();
		return store;
	}

	private async initialize(): Promise<void> {
		await this.db.exec(`
			CREATE TABLE IF NOT EXISTS Users (
				UserId INTEGER PRIMARY KEY AUTOINCREMENT,
				Name VARCHAR(1024),
				CreatedAt DATETIME NOT NULL,
				UpdatedAt DATETIME NOT NULL
			);
		`);
		const columns = await this.db.all<{ name: string }>(
			'PRAGMA table_info(Users)'
		);
		if (!columns.some((column) => column.name === 'Username')) {
			await this.db.exec('ALTER TABLE Users ADD COLUMN Username TEXT');
		}
		if (!columns.some((column) => column.name === 'PasswordHash')) {
			await this.db.exec('ALTER TABLE Users ADD COLUMN PasswordHash TEXT');
		}
		for (const column of [
			'ProfileCardName',
			'ProfileCardUuid',
			'ProfileArt',
			'ProfileCropJson'
		]) {
			if (!columns.some((item) => item.name === column))
				await this.db.exec(`ALTER TABLE Users ADD COLUMN ${column} TEXT`);
		}
		await this.db.exec(
			'CREATE UNIQUE INDEX IF NOT EXISTS Users_Username ON Users (Username COLLATE NOCASE)'
		);
	}

	close(): Promise<void> {
		return this.db.close();
	}

	findByUsername(username: string): Promise<User | undefined> {
		return this.db.get<User>(
			`SELECT UserId, Username, PasswordHash, ProfileCardName, ProfileCardUuid,
				ProfileArt, ProfileCropJson
			FROM Users WHERE Username = ? COLLATE NOCASE AND PasswordHash IS NOT NULL`,
			[username]
		);
	}

	findById(userId: number): Promise<User | undefined> {
		return this.db.get<User>(
			`SELECT UserId, Username, PasswordHash, ProfileCardName, ProfileCardUuid,
				ProfileArt, ProfileCropJson
			FROM Users WHERE UserId = ? AND PasswordHash IS NOT NULL`,
			[userId]
		);
	}

	async setProfile(userId: number, profile: UserProfile): Promise<User | undefined> {
		await this.db.run(
			`UPDATE Users SET ProfileCardName = ?, ProfileCardUuid = ?, ProfileArt = ?,
				ProfileCropJson = ?, UpdatedAt = ? WHERE UserId = ?`,
			[
				profile.cardName,
				profile.cardUuid,
				profile.art,
				JSON.stringify(profile.crop),
				timestamp(),
				userId
			]
		);
		return this.findById(userId);
	}

	async hasAccounts(): Promise<boolean> {
		return !!(await this.db.get(
			'SELECT 1 FROM Users WHERE PasswordHash IS NOT NULL LIMIT 1'
		));
	}

	/** Returns the new user's ID, or null when the username is taken. */
	async create(username: string, passwordHash: string): Promise<number | null> {
		const now = timestamp();
		try {
			const result = await this.db.run(
				'INSERT INTO Users (Name, Username, PasswordHash, CreatedAt, UpdatedAt) VALUES (?, ?, ?, ?, ?)',
				[username, username, passwordHash, now, now]
			);
			return result.lastID;
		} catch (error) {
			if (String(error).includes('UNIQUE constraint failed')) return null;
			throw error;
		}
	}

	/**
	 * Creates the first account. Returns null if any account already exists, checked
	 * in the same statement so two first-run sign-ups cannot both succeed.
	 */
	async createFirst(username: string, passwordHash: string): Promise<number | null> {
		const now = timestamp();
		const result = await this.db.run(
			`INSERT INTO Users (Name, Username, PasswordHash, CreatedAt, UpdatedAt)
			SELECT ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM Users WHERE PasswordHash IS NOT NULL)`,
			[username, username, passwordHash, now, now]
		);
		return result.changes ? result.lastID : null;
	}
}
