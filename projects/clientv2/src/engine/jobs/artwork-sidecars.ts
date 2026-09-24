import { imageKey } from '@torimtg/core';
import type { ImageRef } from '@torimtg/core';
import type { LocalReader } from '../core/local-reader';
import type { ToriMTG } from '../core/types';
import { sidecarQuery } from '../core/image-sidecars';

/** How long a read waits for missing sidecars before answering without them. */
const WAIT_MS = 2500;
/** A sidecar asked for but not stored yet (offline, say) is asked for again after this long. */
const RETRY_MS = 60000;

/**
 * Downloads the server's image sidecars into local storage, where every deck read joins
 * them in. Each image is asked about once; the answer, even "none", is kept for good.
 */
export class ArtworkSidecars {
	private readonly tori: ToriMTG;
	private readonly reader: LocalReader;
	private readonly requestedAt = new Map<string, number>();

	constructor(tori: ToriMTG, reader: LocalReader) {
		this.tori = tori;
		this.reader = reader;
	}

	/** Starts downloading these sidecars in the background. */
	request(refs: ImageRef[]): void {
		for (const ref of this.due(refs))
			void this.tori.queries
				.requestRefresh({ type: 'resource', resource: sidecarQuery(ref) })
				.catch(() => undefined);
	}

	/** Downloads these sidecars and waits for them, but never longer than WAIT_MS. */
	async fetch(refs: ImageRef[]): Promise<void> {
		if (!refs.length) return;
		this.due(refs);
		let timer: ReturnType<typeof setTimeout> | undefined;
		const giveUp = new Promise<void>((resolve) => {
			timer = setTimeout(resolve, WAIT_MS);
		});
		const arrived = Promise.allSettled(
			refs.map((ref) =>
				this.reader.available({ type: 'resource', resource: sidecarQuery(ref) })
			)
		);
		await Promise.race([arrived, giveUp]);
		clearTimeout(timer);
	}

	/** The refs not asked about within RETRY_MS, now marked as asked. */
	private due(refs: ImageRef[]): ImageRef[] {
		const now = Date.now();
		return refs.filter((ref) => {
			const key = imageKey(ref);
			const last = this.requestedAt.get(key);
			if (last !== undefined && now - last < RETRY_MS) return false;
			this.requestedAt.set(key, now);
			return true;
		});
	}
}
