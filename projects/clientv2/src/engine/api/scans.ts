import type { CardImagePipeline } from '../../domain/scans/image-scan-pipelines';
import type { WorkItem } from '../../domain/models/work';
import type { DeferredWorkRunner } from '../jobs/deferred-work-runner';
import type { ImageImportQueue } from '../jobs/image-import-queue';
import type { WorkQueue } from '../jobs/work-queue';
import type { DeviceProfile } from '../ports';

/**
 * Card photos: scanned on this device, or queued for a desktop to scan. Progress arrives
 * as scans-changed and work-queue-changed events.
 */
export class ScansApi {
	private readonly workQueue: WorkQueue;
	private readonly imageImports: ImageImportQueue;
	private readonly runner: DeferredWorkRunner;
	private readonly device: DeviceProfile;

	constructor(workQueue: WorkQueue, imageImports: ImageImportQueue, runner: DeferredWorkRunner, device: DeviceProfile) {
		this.workQueue = workQueue;
		this.imageImports = imageImports;
		this.runner = runner;
		this.device = device;
	}

	/** Phones and tablets scan slowly; photos taken there are better queued for a desktop. */
	scansAreSlowHere(): boolean {
		return this.device.isMobile();
	}

	/** Scans the photo here and adds what it finds to the deck. Returns the scan's id. */
	scanPhoto(deckId: string, photo: File, pipeline: CardImagePipeline): string {
		return this.imageImports.enqueue(deckId, photo, null, pipeline);
	}

	/** Saves the photo for the next desktop visit to scan. */
	queueForDesktop(deckId: string, photo: File, pipeline: CardImagePipeline): Promise<WorkItem> {
		return this.workQueue.queueCardImage(deckId, photo, pipeline);
	}

	/** Claims a queued photo and scans it here. Null when another device got to it first. */
	runQueued(item: WorkItem): Promise<string | null> {
		return this.runner.runHere(item);
	}

	/** Picks up queued photos on this device as they arrive (desktops only). Returns a stop function. */
	runQueuedScansHere(): () => void {
		return this.runner.start();
	}

	/** Publishes the queue as work-queue-changed events until the returned function is called. */
	watchQueue(): () => void {
		return this.workQueue.watch();
	}

	/** Adds a card the person picked by hand to a scan's deck. */
	addCandidate(scanId: string, name: string, count: number): Promise<void> {
		return this.imageImports.addCandidate(scanId, name, count);
	}

	/** Clears a finished scan from the list. */
	dismiss(scanId: string): void {
		this.imageImports.dismiss(scanId);
	}

	retry(workId: string): Promise<void> {
		return this.workQueue.retry(workId);
	}

	remove(workId: string): Promise<void> {
		return this.workQueue.remove(workId);
	}
}
