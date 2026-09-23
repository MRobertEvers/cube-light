import type { ToriMTG } from '../core/types';
import type { LocalReader } from '../core/local-reader';
import type { Crypto } from '../ports';
import { newId } from '../../domain/ids';
import type { CardImagePipeline } from '../../domain/scans/image-scan-pipelines';
import type { CardApi } from './cards';
import type { ImportedCard } from '../../domain/models/deck';
import type { WorkItem } from '../../domain/models/work';

/** How long claiming a scan waits for the server to grant it. */
const CLAIM_WAIT_MS = 20000;

/**
 * Card photos a phone queued for a desktop to scan. The queue is shared through the
 * server, so a desktop claims an item before scanning it and reports back as it goes.
 */
export class WorkApi {
	private readonly tori: ToriMTG;
	private readonly reader: LocalReader;
	private readonly cards: CardApi;
	private readonly crypto: Crypto;

	constructor(tori: ToriMTG, reader: LocalReader, cards: CardApi, crypto: Crypto) {
		this.tori = tori;
		this.reader = reader;
		this.cards = cards;
		this.crypto = crypto;
	}

	async items(): Promise<WorkItem[]> {
		return (await this.reader.value<{ items: WorkItem[] }>({ type: 'work' })).items;
	}

	observeItems(
		listener: (items: WorkItem[]) => void,
		onError?: (error: unknown) => void
	): () => void {
		return this.reader.observe<{ items: WorkItem[] }>(
			{ type: 'work' },
			(data) => listener(data.items),
			onError
		);
	}

	/** Asks the server for new progress; observers see whatever arrives. */
	async requestRefresh(): Promise<void> {
		await this.tori.queries.requestRefresh({ type: 'work' });
	}

	async queueCardImage(
		deckId: string,
		file: File,
		pipelineArg?: CardImagePipeline
	): Promise<WorkItem> {
		const pipeline = pipelineArg === undefined ? 'card-aware' : pipelineArg;

		const id = newId('work');
		const blobId = await this.tori.saveBlob(file);
		await this.tori.commands.execute({
			type: 'work.queue',
			id,
			deckId,
			fileName: file.name,
			contentType: file.type || 'image/jpeg',
			blobId,
			pipeline
		});
		const queued = (await this.localItems()).find((item) => item.workId === id);
		if (!queued) throw new Error('Could not queue this photo');
		return queued;
	}

	/** The queued photo, from this device when it is here, otherwise downloaded. */
	async image(item: WorkItem): Promise<File> {
		const current = (await this.localItems()).find(
			(candidate) => candidate.workId === item.workId
		);
		if (!current) throw new Error('Could not download the queued photo');
		const blobId = current.imageUrl.split('/').pop()!;
		let blob: Blob;
		try {
			blob = await this.tori.blob(blobId);
		} catch {
			blob = (await this.reader.resource({ type: 'blob', id: blobId })).body;
		}
		return new File([blob], item.fileName, { type: blob.type });
	}

	/**
	 * Claims the item for this device and returns the claim's token. A claim cannot be
	 * granted offline, so this waits for the server to accept it.
	 */
	async claim(workId: string): Promise<string> {
		const token = this.crypto.randomUUID();
		const commit = await this.tori.commands.execute({ type: 'work.start', id: workId, token });
		await this.waitAccepted(commit.operationId);
		return token;
	}

	async progress(
		workId: string,
		token: string,
		completed: number,
		total: number
	): Promise<void> {
		await this.tori.commands.execute({ type: 'work.progress', id: workId, token, completed, total });
	}

	/** Adds the scan's cards to its deck and finishes the item, as one edit. */
	async complete(workId: string, token: string, cards: ImportedCard[]): Promise<void> {
		const deckId = (await this.localItems()).find((item) => item.workId === workId)?.deck?.deckId;
		if (!deckId) throw new Error('The destination deck is unavailable.');
		const edits = await this.cards.importEdits(cards);
		await this.tori.commands.execute({
			type: 'work.complete',
			id: workId,
			token,
			edits,
			deckId,
			deckRevision: -1
		});
	}

	async fail(workId: string, token: string, error: string): Promise<void> {
		await this.tori.commands.execute({ type: 'work.fail', id: workId, token, error: error.slice(0, 500) });
	}

	/** Hands the item back so another device can pick it up. */
	async release(workId: string, token: string): Promise<void> {
		await this.tori.commands.execute({ type: 'work.release', id: workId, token });
	}

	async retry(workId: string): Promise<void> {
		await this.tori.commands.execute({ type: 'work.retry', id: workId });
	}

	async delete(workId: string): Promise<void> {
		await this.tori.commands.execute({ type: 'work.delete', id: workId });
	}

	/** The queue as saved on this device, without waiting for the server. */
	private async localItems(): Promise<WorkItem[]> {
		const snapshot = await this.tori.queries.read<{ items: WorkItem[] }>({ type: 'work' });
		return snapshot.data?.items ?? [];
	}

	private async waitAccepted(operationId: string): Promise<void> {
		const started = Date.now();
		while (Date.now() - started < CLAIM_WAIT_MS) {
			const intent = (await this.tori.pending()).find(
				(item) => item.operationId === operationId
			);
			if (!intent) return;
			if (['conflict', 'rejected'].includes(intent.status))
				throw new Error(intent.error || 'Another device is running this scan.');
			await new Promise<void>((resolve) => setTimeout(resolve, 200));
		}
		throw new Error('Connect to the server to claim this scan.');
	}
}
