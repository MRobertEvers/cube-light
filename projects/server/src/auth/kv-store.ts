import { randomBytes } from 'crypto';
import path from 'path';

/**
 * The in-memory key-value store compiled from native/kv_store.c. Keys and values
 * are strings; TTLs are milliseconds, with 0 or undefined meaning no expiry.
 * Contents live only as long as the process.
 */
export interface KVStore {
	set(key: string, value: string, ttlMs?: number): void;
	get(key: string): string | null;
	del(key: string): boolean;
	/** Returns whether the key exists. A ttl of 0 removes its expiry. */
	expire(key: string, ttlMs: number): boolean;
	/** Milliseconds left, -1 without expiry, -2 without the key. */
	ttl(key: string): number;
	/** Adds 1, starting from 0 with the given TTL when the key is new. */
	incr(key: string, ttlMs?: number): number;
	/** Checks up to maxSlots slots for expired keys; returns how many it removed. */
	sweep(maxSlots: number): number;
	/** Keys held, including expired ones not yet swept. */
	readonly size: number;
}

// node-gyp builds into build/Release beside tsc's build/src.
const native = require(path.join(__dirname, '../../Release/kv_store.node')) as {
	KVStore: new (seed: Buffer) => KVStore;
};

const SWEEP_INTERVAL_MS = 1000;
const SWEEP_SLOTS = 4096;

/** A store keyed with a fresh random hash seed that reclaims expired keys in the background. */
export function createKVStore(): KVStore {
	const store = new native.KVStore(randomBytes(16));
	setInterval(() => store.sweep(SWEEP_SLOTS), SWEEP_INTERVAL_MS).unref();
	return store;
}
