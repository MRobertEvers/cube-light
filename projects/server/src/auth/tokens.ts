import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { Database } from '../database/app/database';
import type {
	TokenFamily,
	TokenTransaction
} from '../database/app/token-transaction';
import type { TokenPair } from '@torimtg/core';

export const ACCESS_TOKEN_MS = 15 * 60 * 1000;
export const REFRESH_TOKEN_MS = 30 * 24 * 60 * 60 * 1000;
type Claims = {
	iss: 'torimtg';
	aud: 'torimtg-api';
	sub: string;
	generation: number;
	familyId: string;
	type: 'access' | 'refresh';
	jti: string;
	iat: number;
	exp: number;
};

function tokenHash(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}
function valid(value: unknown): value is string {
	return (
		typeof value === 'string' &&
		value.length <= 2048 &&
		/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)
	);
}
function secret(): string {
	return randomBytes(32).toString('base64url');
}

/** Signed bearer credentials, checked against the principal's persisted token generation. */
export class TokenStore {
	private readonly database: Database;
	private signingKey = '';
	constructor(database: Database) {
		this.database = database;
	}

	async initialize(): Promise<void> {
		this.signingKey = this.database.getOrCreateTokenSigningKey(secret());
	}

	private sign(claims: Claims): string {
		const header = Buffer.from(
			JSON.stringify({ alg: 'HS256', typ: 'JWT' })
		).toString('base64url');
		const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
		const unsigned = `${header}.${body}`;
		return `${unsigned}.${createHmac('sha256', this.signingKey).update(unsigned).digest('base64url')}`;
	}

	private verify(
		token: string,
		type: Claims['type'],
		now: number
	): Claims | null {
		if (!valid(token) || !this.signingKey) return null;
		try {
			const [header, body, signature] = token.split('.');
			const meta = JSON.parse(
				Buffer.from(header, 'base64url').toString()
			);
			if (meta.alg !== 'HS256' || meta.typ !== 'JWT') return null;
			const expected = createHmac('sha256', this.signingKey)
				.update(`${header}.${body}`)
				.digest();
			const supplied = Buffer.from(signature, 'base64url');
			if (
				supplied.length !== expected.length ||
				!timingSafeEqual(supplied, expected)
			)
				return null;
			const claims = JSON.parse(
				Buffer.from(body, 'base64url').toString()
			) as Claims;
			if (
				claims.iss !== 'torimtg' ||
				claims.aud !== 'torimtg-api' ||
				claims.type !== type ||
				!/^[1-9][0-9]*$/.test(claims.sub) ||
				!Number.isSafeInteger(claims.generation) ||
				claims.generation < 0 ||
				!Number.isFinite(claims.exp) ||
				claims.exp * 1000 <= now ||
				!Number.isFinite(claims.iat) ||
				claims.iat * 1000 > now + 60000
			)
				return null;
			return claims;
		} catch {
			return null;
		}
	}

	private generationMatches(
		tx: TokenTransaction,
		family: TokenFamily
	): boolean {
		return tx.getGeneration(family.UserId) === family.Generation;
	}

	private pair(
		userId: number,
		familyId: string,
		generation: number,
		issuedAt: number,
		refreshExpiresAt: number,
		seed: string
	): TokenPair {
		const common = {
			iss: 'torimtg' as const,
			aud: 'torimtg-api' as const,
			sub: String(userId),
			generation,
			familyId,
			iat: Math.floor(issuedAt / 1000)
		};
		const accessExpiresAt = Math.min(
			issuedAt + ACCESS_TOKEN_MS,
			refreshExpiresAt
		);
		return {
			tokenType: 'Bearer',
			generation,
			familyId,
			accessExpiresAt,
			refreshExpiresAt,
			accessToken: this.sign({
				...common,
				type: 'access',
				jti: `${seed}:access`,
				exp: Math.floor(accessExpiresAt / 1000)
			}),
			refreshToken: this.sign({
				...common,
				type: 'refresh',
				jti: `${seed}:refresh`,
				exp: Math.floor(refreshExpiresAt / 1000)
			})
		};
	}

	issue(userId: number, username: string, nowArg?: number): TokenPair {
		const now = nowArg === undefined ? Date.now() : nowArg;
		return this.database.tokenTransaction((tx) => {
			const generation = tx.getGeneration(userId);
			if (generation === undefined)
				throw new Error('Cannot mint tokens for a missing principal.');
			const pair = this.pair(
				userId,
				randomBytes(16).toString('hex'),
				generation,
				now,
				now + REFRESH_TOKEN_MS,
				secret()
			);
			tx.createFamily({
				Id: pair.familyId,
				UserId: userId,
				Username: username,
				ExpiresAt: pair.refreshExpiresAt,
				Revoked: 0,
				CurrentHash: tokenHash(pair.refreshToken),
				Generation: pair.generation
			});
			this.insertTokens(tx, pair);
			return pair;
		});
	}

	private insertTokens(tx: TokenTransaction, pair: TokenPair): void {
		tx.insertTokens({
			accessHash: tokenHash(pair.accessToken),
			refreshHash: tokenHash(pair.refreshToken),
			familyId: pair.familyId,
			accessExpiresAt: pair.accessExpiresAt
		});
	}

	access(
		token: string,
		nowArg?: number
	): { userId: number; username: string; familyId: string } | null {
		const now = nowArg === undefined ? Date.now() : nowArg;
		const claims = this.verify(token, 'access', now);
		if (!claims) return null;
		return this.database.tokenTransaction((tx) => {
			const row = tx.findAccessFamily(tokenHash(token), now);
			return row &&
				row.Id === claims.familyId &&
				String(row.UserId) === claims.sub &&
				row.Generation === claims.generation &&
				this.generationMatches(tx, row)
				? {
						userId: row.UserId,
						username: row.Username,
						familyId: row.Id
					}
				: null;
		});
	}

	rotate(
		refreshToken: string,
		requestId: string,
		nowArg?: number
	): TokenPair | null {
		if (
			!valid(refreshToken) ||
			typeof requestId !== 'string' ||
			!/^[A-Za-z0-9_-]{16,80}$/.test(requestId)
		)
			return null;
		const now = nowArg === undefined ? Date.now() : nowArg;
		const claims = this.verify(refreshToken, 'refresh', now);
		if (!claims) return null;
		return this.database.tokenTransaction((tx) => {
			const previous = tx.findRefreshToken(tokenHash(refreshToken));
			if (!previous) return null;
			const family = tx.findFamily(previous.FamilyId);
			if (
				!family ||
				family.Revoked ||
				family.ExpiresAt <= now ||
				claims.familyId !== family.Id ||
				claims.sub !== String(family.UserId) ||
				claims.generation !== family.Generation ||
				!this.generationMatches(tx, family)
			)
				return null;
			if (previous.RequestId && previous.RequestId !== requestId) {
				// Reuse with a different attempt signals a stolen/stale refresh token.
				tx.revokeFamily(family.Id);
				return null;
			}
			if (previous.RequestId && family.CurrentHash !== previous.NextHash)
				return null;
			const issuedAt =
				previous.IssuedAt === null ? now : previous.IssuedAt;
			// Deterministic only for this credential + durable attempt ID: a lost response
			// can be retried after a worker/server crash without storing plaintext tokens.
			const seed = createHmac('sha256', refreshToken)
				.update(`${family.Id}:${requestId}`)
				.digest('base64url');
			const pair = this.pair(
				family.UserId,
				family.Id,
				family.Generation,
				issuedAt,
				family.ExpiresAt,
				seed
			);
			if (!previous.RequestId) {
				this.insertTokens(tx, pair);
				tx.recordRotation(
					previous.Hash,
					requestId,
					issuedAt,
					tokenHash(pair.refreshToken)
				);
				tx.setCurrentHash(family.Id, tokenHash(pair.refreshToken));
			}
			return pair;
		});
	}

	revoke(familyId: string): void {
		this.database.tokenTransaction((tx) => tx.revokeFamily(familyId));
	}

	identity(familyId: string): { userId: number; username: string } | null {
		return this.database.tokenTransaction((tx) => {
			const family = tx.findFamily(familyId);
			return family &&
				!family.Revoked &&
				family.ExpiresAt > Date.now() &&
				this.generationMatches(tx, family)
				? { userId: family.UserId, username: family.Username }
				: null;
		});
	}

	revokeRefresh(refreshToken: string): void {
		if (!valid(refreshToken)) return;
		this.database.tokenTransaction((tx) => {
			const row = tx.findRefreshToken(tokenHash(refreshToken));
			if (row) tx.revokeFamily(row.FamilyId);
		});
	}

	/** Incrementing one principal row immediately invalidates all devices and token families. */
	revokePrincipal(userId: number): number {
		return this.database.tokenTransaction((tx) =>
			tx.incrementGeneration(userId)
		);
	}
}
