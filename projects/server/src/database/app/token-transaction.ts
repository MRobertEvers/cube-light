import type { SqliteTransaction } from '../sqlite';

export type TokenFamily = {
	Id: string;
	UserId: number;
	Username: string;
	ExpiresAt: number;
	Revoked: number;
	CurrentHash: string;
	Generation: number;
};
export type RefreshTokenRow = {
	Hash: string;
	FamilyId: string;
	RequestId: string | null;
	IssuedAt: number | null;
	NextHash: string | null;
};

export type TokenHashes = {
	accessHash: string;
	refreshHash: string;
	familyId: string;
	accessExpiresAt: number;
};

/** Typed persistence operations scoped to one application database transaction. */
export class TokenTransaction {
	constructor(private readonly tx: SqliteTransaction) {}

	getGeneration(userId: number): number | undefined {
		return this.tx.get<{ token_generation: number }>(
			'SELECT token_generation FROM Users WHERE UserId=?',
			[userId]
		)?.token_generation;
	}

	incrementGeneration(userId: number): number {
		this.tx.run(
			'UPDATE Users SET token_generation=token_generation+1 WHERE UserId=?',
			[userId]
		);
		const generation = this.getGeneration(userId);
		if (generation === undefined) throw new Error('Principal not found.');
		return generation;
	}

	createFamily(family: TokenFamily): void {
		this.tx.run(
			'INSERT INTO AuthTokenFamilies(Id, UserId, Username, ExpiresAt, Revoked, CurrentHash, Generation) VALUES (?, ?, ?, ?, ?, ?, ?)',
			[
				family.Id,
				family.UserId,
				family.Username,
				family.ExpiresAt,
				family.Revoked,
				family.CurrentHash,
				family.Generation
			]
		);
	}

	insertTokens(tokens: TokenHashes): void {
		this.tx.run(
			'INSERT INTO AuthAccessTokens(Hash, FamilyId, ExpiresAt) VALUES (?, ?, ?)',
			[tokens.accessHash, tokens.familyId, tokens.accessExpiresAt]
		);
		this.tx.run(
			'INSERT INTO AuthRefreshTokens(Hash, FamilyId, RequestId, IssuedAt, NextHash) VALUES (?, ?, NULL, NULL, NULL)',
			[tokens.refreshHash, tokens.familyId]
		);
	}

	findAccessFamily(hash: string, now: number): TokenFamily | undefined {
		return this.tx.get<TokenFamily>(
			'SELECT f.* FROM AuthAccessTokens a JOIN AuthTokenFamilies f ON a.FamilyId=f.Id WHERE a.Hash=? AND a.ExpiresAt>? AND f.ExpiresAt>? AND f.Revoked=0',
			[hash, now, now]
		);
	}

	findRefreshToken(hash: string): RefreshTokenRow | undefined {
		return this.tx.get<RefreshTokenRow>(
			'SELECT * FROM AuthRefreshTokens WHERE Hash=?',
			[hash]
		);
	}

	findFamily(familyId: string): TokenFamily | undefined {
		return this.tx.get<TokenFamily>(
			'SELECT * FROM AuthTokenFamilies WHERE Id=?',
			[familyId]
		);
	}

	revokeFamily(familyId: string): void {
		this.tx.run(
			'UPDATE AuthTokenFamilies SET Revoked=1 WHERE Id=?',
			[familyId]
		);
	}

	recordRotation(
		hash: string,
		requestId: string,
		issuedAt: number,
		nextHash: string
	): void {
		this.tx.run(
			'UPDATE AuthRefreshTokens SET RequestId=?, IssuedAt=?, NextHash=? WHERE Hash=?',
			[requestId, issuedAt, nextHash, hash]
		);
	}

	setCurrentHash(familyId: string, hash: string): void {
		this.tx.run(
			'UPDATE AuthTokenFamilies SET CurrentHash=? WHERE Id=?',
			[hash, familyId]
		);
	}
}
