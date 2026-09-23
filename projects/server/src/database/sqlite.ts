// TypeScript 4.2 predates the node:sqlite type declarations.
const { DatabaseSync } = require('node:sqlite') as {
	DatabaseSync: new (
		filename: string,
		options?: { readOnly?: boolean }
	) => NativeDatabase;
};

interface NativeDatabase {
	prepare(sql: string): NativeStatement;
	exec(sql: string): void;
	close(): void;
}

interface NativeMethod<R> {
	apply(statement: NativeStatement, parameters: unknown[]): R;
}

interface NativeStatement {
	all: NativeMethod<unknown[]>;
	get: NativeMethod<unknown | undefined>;
	run: NativeMethod<{
		lastInsertRowid: number | bigint;
		changes: number | bigint;
	}>;
}

export interface SqliteTransaction {
	all<T>(sql: string, params?: unknown[]): T[];
	get<T>(sql: string, params?: unknown[]): T | undefined;
	run(sql: string, params?: unknown[]): { lastID: number; changes: number };
}

export class SqliteDatabase {
	private readonly db: NativeDatabase;

	constructor(filepath: string, readOnlyArg?: boolean) {
		const readOnly = readOnlyArg === undefined ? false : readOnlyArg;

		this.db = new DatabaseSync(filepath, { readOnly });
	}

	async all<T>(sql: string, paramsArg?: unknown[]): Promise<T[]> {
		const params = paramsArg === undefined ? [] : paramsArg;

		const statement = this.db.prepare(sql);
		return statement.all.apply(statement, params) as T[];
	}

	async get<T>(sql: string, paramsArg?: unknown[]): Promise<T | undefined> {
		const params = paramsArg === undefined ? [] : paramsArg;

		const statement = this.db.prepare(sql);
		return statement.get.apply(statement, params) as T | undefined;
	}

	async run(
		sql: string,
		paramsArg?: unknown[]
	): Promise<{ lastID: number; changes: number }> {
		const params = paramsArg === undefined ? [] : paramsArg;

		const statement = this.db.prepare(sql);
		const result = statement.run.apply(statement, params);
		return {
			lastID: Number(result.lastInsertRowid),
			changes: Number(result.changes)
		};
	}

	async exec(sql: string): Promise<void> {
		this.db.exec(sql);
	}

	async close(): Promise<void> {
		this.db.close();
	}

	transaction<T>(callback: (tx: SqliteTransaction) => T): T {
		const instance = this;

		this.db.exec('BEGIN');
		const tx: SqliteTransaction = {
			all: function <R>(sql: string, paramsArg?: unknown[]) {
				const params = paramsArg === undefined ? [] : paramsArg;
				const statement = instance.db.prepare(sql);
				return statement.all.apply(statement, params) as R[];
			},
			get: function <R>(sql: string, paramsArg?: unknown[]) {
				const params = paramsArg === undefined ? [] : paramsArg;
				const statement = instance.db.prepare(sql);
				return statement.get.apply(statement, params) as R | undefined;
			},
			run: function (sql: string, paramsArg?: unknown[]) {
				const params = paramsArg === undefined ? [] : paramsArg;

				const statement = instance.db.prepare(sql);
				const result = statement.run.apply(statement, params);
				return {
					lastID: Number(result.lastInsertRowid),
					changes: Number(result.changes)
				};
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
