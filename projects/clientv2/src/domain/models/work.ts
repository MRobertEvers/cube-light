import type { CardImagePipeline } from '../scans/image-scan-pipelines';

export type WorkItemKind = 'card-image-ocr';
export type WorkItemStatus = 'pending' | 'running' | 'completed' | 'failed';

/** Work a phone handed off to the next desktop visit. */
export type WorkItem = {
	workId: string;
	kind: WorkItemKind;
	deck: { deckId: string; name: string } | null;
	status: WorkItemStatus;
	fileName: string;
	pipeline?: CardImagePipeline;
	progress: { completed: number; total: number };
	cardsAdded: number;
	error: string | null;
	imageUrl: string;
	createdAt: string;
	updatedAt: string;
};

/** Another device holds, or has finished, the item. */
export class WorkClaimLostError extends Error {
	constructor() {
		super('Another device took over this scan');
	}
}

/** Items still worth the user's attention: anything not yet finished cleanly and dismissed. */
export function isOpenWork(item: WorkItem): boolean {
	return item.status !== 'completed';
}
