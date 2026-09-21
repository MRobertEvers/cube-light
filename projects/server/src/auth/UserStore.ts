import { SqliteDatabase } from '../database/sqlite';

export type User = {
	UserId: number;
	Username: string;
	PasswordHash: string;
};

export type PublicUser = { id: number; username: string };

export const USERNAME = /^[A-Za-z0-9_.@-]{3,64}$/;

export function publicUser(user: Pick<User, 'UserId' | 'Username'>): PublicUser {
	return { id: user.UserId, username: user.Username };
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
		await this.db.exec(
			'CREATE UNIQUE INDEX IF NOT EXISTS Users_Username ON Users (Username COLLATE NOCASE)'
		);
	}

	close(): Promise<void> {
		return this.db.close();
	}

	findByUsername(username: string): Promise<User | undefined> {
		return this.db.get<User>(
			'SELECT UserId, Username, PasswordHash FROM Users WHERE Username = ? COLLATE NOCASE AND PasswordHash IS NOT NULL',
			[username]
		);
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
