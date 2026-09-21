// TypeScript 4.2 predates the node:sqlite type declarations.
const { DatabaseSync } = require('node:sqlite') as {
	DatabaseSync: new (filename: string, options?: { readOnly?: boolean }) => NativeDatabase;
};

interface NativeDatabase {
	prepare(sql: string): NativeStatement;
	exec(sql: string): void;
	close(): void;
}

interface NativeStatement {
	all(...parameters: unknown[]): unknown[];
	get(...parameters: unknown[]): unknown | undefined;
	run(...parameters: unknown[]): { lastInsertRowid: number | bigint; changes: number | bigint };
}

export interface SqliteTransaction {
	all<T>(sql: string, params?: unknown[]): T[];
	get<T>(sql: string, params?: unknown[]): T | undefined;
	run(sql: string, params?: unknown[]): { lastID: number; changes: number };
}

export class SqliteDatabase {
	private readonly db: NativeDatabase;

	constructor(filepath: string, readOnly = false) {
		this.db = new DatabaseSync(filepath, { readOnly });
	}

	async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
		return this.db.prepare(sql).all(...params) as T[];
	}

	async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
		return this.db.prepare(sql).get(...params) as T | undefined;
	}

	async run(sql: string, params: unknown[] = []): Promise<{ lastID: number; changes: number }> {
		const result = this.db.prepare(sql).run(...params);
		return { lastID: Number(result.lastInsertRowid), changes: Number(result.changes) };
	}

	async exec(sql: string): Promise<void> {
		this.db.exec(sql);
	}

	async close(): Promise<void> {
		this.db.close();
	}

	transaction<T>(callback: (tx: SqliteTransaction) => T): T {
		this.db.exec('BEGIN');
		const tx: SqliteTransaction = {
			all: <R>(sql: string, params: unknown[] = []) => this.db.prepare(sql).all(...params) as R[],
			get: <R>(sql: string, params: unknown[] = []) => this.db.prepare(sql).get(...params) as R | undefined,
			run: (sql: string, params: unknown[] = []) => {
				const result = this.db.prepare(sql).run(...params);
				return { lastID: Number(result.lastInsertRowid), changes: Number(result.changes) };
			}
		};
		try {
			const result = callback(tx);
			this.db.exec('COMMIT');
			return result;
		} catch (error) {
			this.db.exec('ROLLBACK');
			throw error;
		}
	}
}

export function placeholders(values: unknown[]): string {
	return values.map(() => '?').join(', ');
}
