import type { LocalSnapshot, Query, ResourceQuery, StoredResource } from '@torimtg/core';
import type { ToriMTG } from './types';

/** How long a read of data missing from this device waits for the sync host to download it. */
const DOWNLOAD_WAIT_MS = 18000;

/**
 * Reads ToriMTG's local data. Every read also asks the sync host to refresh it, so
 * the answer is local first and newer server data follows as change notices.
 */
export class LocalReader {
	private readonly tori: ToriMTG;

	constructor(tori: ToriMTG) {
		this.tori = tori;
	}

	/** Answers from local data when it has any; otherwise waits for the server to supply it. */
	async available<T>(query: Query): Promise<LocalSnapshot<T>> {
		const tori = this.tori;
		const snapshot = await tori.queries.read<T>(query);
		await tori.queries.requestRefresh(query);
		if (snapshot.presence !== 'missing') return snapshot;
		return new Promise<LocalSnapshot<T>>((resolve, reject) => {
			let done = false;
			const timeout = setTimeout(
				() =>
					finish(
						new Error(
							'Not available on this device yet. Connect to download it.'
						)
					),
				DOWNLOAD_WAIT_MS
			);
			const unsubscribe = tori.subscribe(check);
			function finish(error?: Error, value?: LocalSnapshot<T>) {
				if (done) return;
				done = true;
				clearTimeout(timeout);
				unsubscribe();
				if (error) reject(error);
				else resolve(value as LocalSnapshot<T>);
			}
			async function check() {
				try {
					const result = await tori.queries.read<T>(query);
					if (result.presence !== 'missing') finish(undefined, result);
					else if (result.lastError) finish(new Error(result.lastError));
				} catch (error) {
					finish(
						error instanceof Error
							? error
							: new Error('Local read failed.')
					);
				}
			}
			void check();
		});
	}

	/** A downloaded resource from this device only; null when it is not here. Never waits for the server. */
	async localResource(query: ResourceQuery): Promise<StoredResource | null> {
		const snapshot = await this.tori.queries.read<StoredResource>({ type: 'resource', resource: query });
		const stored = snapshot.data;
		if (snapshot.presence === 'missing' || !stored || stored.status >= 400) return null;
		return stored;
	}

	/** A downloaded JSON resource from this device only, parsed; null when it is not here. Never waits for the server. */
	async localJson<T>(query: ResourceQuery): Promise<T | null> {
		const stored = await this.localResource(query);
		return stored ? (JSON.parse(await stored.body.text()) as T) : null;
	}

	/**
	 * Downloads a resource again and waits for the new copy: one validated after the copy
	 * here, if any. Rejects when the download fails or takes too long.
	 */
	async redownload(query: ResourceQuery): Promise<StoredResource> {
		const tori = this.tori;
		const full: Query = { type: 'resource', resource: query };
		const before = (await tori.queries.read<StoredResource>(full)).data?.validatedAt ?? null;
		await tori.queries.requestRefresh(full);
		return new Promise<StoredResource>((resolve, reject) => {
			let done = false;
			const timeout = setTimeout(() => finish(new Error('The download is taking too long. Try again.')), DOWNLOAD_WAIT_MS);
			const unsubscribe = tori.subscribe(check);
			function finish(error?: Error, value?: StoredResource) {
				if (done) return;
				done = true;
				clearTimeout(timeout);
				unsubscribe();
				if (error) reject(error);
				else resolve(value as StoredResource);
			}
			async function check() {
				try {
					const result = await tori.queries.read<StoredResource>(full);
					const stored = result.data;
					if (stored && stored.validatedAt !== before) {
						if (stored.status >= 400) finish(new Error(`Unable to load ${query.type} (${stored.status})`));
						else finish(undefined, stored);
					} else if (result.lastError) finish(new Error(result.lastError));
				} catch (error) {
					finish(error instanceof Error ? error : new Error('Local read failed.'));
				}
			}
			void check();
		});
	}

	/** Asks the sync host to download `query` when it can, without waiting for it. */
	async refreshLater(query: Query): Promise<void> {
		await this.tori.queries.requestRefresh(query);
	}

	/** The data of `available`, for callers that do not need the snapshot's sync status. */
	async value<T>(query: Query): Promise<T> {
		return (await this.available<T>(query)).data as T;
	}

	/** A downloaded server resource, such as card details or a blob. */
	async resource(query: ResourceQuery): Promise<StoredResource> {
		const stored = await this.value<StoredResource>({
			type: 'resource',
			resource: query
		});
		if (stored.status >= 400)
			throw new Error(`Unable to load ${query.type} (${stored.status})`);
		return stored;
	}

	/** A downloaded JSON resource, parsed. */
	async json<T>(query: ResourceQuery): Promise<T> {
		return JSON.parse(await (await this.resource(query)).body.text()) as T;
	}

	/**
	 * Calls `listener` with the query's local data now and after every local change,
	 * and asks the server for fresher data. Returns a function that stops observing.
	 */
	observe<T>(
		query: Query,
		listener: (value: T) => void,
		onError?: (error: unknown) => void
	): () => void {
		const tori = this.tori;
		let active = true;
		let revision = -1;
		async function read() {
			try {
				const snapshot = await tori.queries.read<T>(query);
				if (
					active &&
					snapshot.data !== null &&
					snapshot.localRevision >= revision
				) {
					revision = snapshot.localRevision;
					listener(snapshot.data);
				}
			} catch (error) {
				if (active) onError?.(error);
			}
		}
		// Subscribe before reading, so a change between the two is not missed.
		const unsubscribe = tori.subscribe(() => {
			void read();
		});
		void read().then(() =>
			tori.queries.requestRefresh(query).catch(() => undefined)
		);
		return function stop() {
			active = false;
			unsubscribe();
		};
	}
}
