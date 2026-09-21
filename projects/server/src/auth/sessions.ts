import { randomBytes } from 'crypto';
import { KVStore } from './kv-store';

export type Session = { userId: number; username: string };

/** A session ends after this long without a request. */
export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
/** Sliding expiry is renewed (and the cookie re-sent) at most this often. */
const RENEW_AFTER_MS = 24 * 60 * 60 * 1000;

const PREFIX = 'session:';
const SESSION_ID = /^[A-Za-z0-9_-]{43}$/;

/**
 * Sessions held in the native key-value store under unguessable IDs. They do not
 * survive a server restart; everyone signs in again afterwards.
 */
export class SessionStore {
	constructor(private readonly kv: KVStore) {}

	/** Returns the new session's ID, 256 random bits in URL-safe base64. */
	create(session: Session): string {
		const id = randomBytes(32).toString('base64url');
		this.kv.set(PREFIX + id, JSON.stringify(session), SESSION_TTL_MS);
		return id;
	}

	/** The session, and whether its expiry was just extended so the cookie should be re-sent. */
	get(id: string): { session: Session; renewed: boolean } | null {
		if (!SESSION_ID.test(id)) return null;
		const key = PREFIX + id;
		const value = this.kv.get(key);
		if (value === null) return null;
		const renewed = this.kv.ttl(key) < SESSION_TTL_MS - RENEW_AFTER_MS;
		if (renewed) this.kv.expire(key, SESSION_TTL_MS);
		return { session: JSON.parse(value) as Session, renewed };
	}

	destroy(id: string): void {
		if (SESSION_ID.test(id)) this.kv.del(PREFIX + id);
	}
}
