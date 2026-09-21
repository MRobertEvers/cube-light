import { API_URI } from '../config/api-url';
import type { ImportedCard } from './fetch-api-import-cards';
import { apiFetch } from './utils';

export type WorkItemKind = 'card-image-ocr';
export type WorkItemStatus = 'pending' | 'running' | 'completed' | 'failed';

/** Work a phone handed off to the next desktop visit. */
export type WorkItem = {
	workId: string;
	kind: WorkItemKind;
	deck: { deckId: string; name: string } | null;
	status: WorkItemStatus;
	fileName: string;
	progress: { completed: number; total: number };
	cardsAdded: number;
	error: string | null;
	imageUrl: string;
	createdAt: string;
	updatedAt: string;
};

/** The server answers 409 when another device holds, or has finished, the item. */
export class WorkClaimLostError extends Error {
	constructor() {
		super('Another device took over this scan');
	}
}

function request(path: string, init?: RequestInit): Promise<Response> {
	return apiFetch(`${API_URI}${path}`, init);
}

function postJson(path: string, body?: unknown): Promise<Response> {
	return request(path, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body ?? {})
	});
}

function expectOk(response: Response, message: string): void {
	if (response.status === 409) throw new WorkClaimLostError();
	if (!response.ok) throw new Error(message);
}

export async function fetchAPIWorkItems(): Promise<WorkItem[]> {
	const response = await request('/work', { cache: 'no-store' });
	expectOk(response, 'Could not load queued work');
	return ((await response.json()) as { items: WorkItem[] }).items;
}

export async function fetchAPIQueueCardImage(
	deckId: string,
	file: File
): Promise<WorkItem> {
	const query = new URLSearchParams({ deckId, fileName: file.name });
	const response = await request(`/work/card-image-ocr?${query}`, {
		method: 'POST',
		headers: { 'Content-Type': file.type || 'image/jpeg' },
		body: file
	});
	if (response.status === 413)
		throw new Error('This photo is too large to queue (25 MB limit)');
	expectOk(response, 'Could not queue this photo');
	return (await response.json()) as WorkItem;
}

export async function fetchAPIWorkImage(item: WorkItem): Promise<File> {
	const response = await request(`/work/${item.workId}/image`);
	expectOk(response, 'Could not download the queued photo');
	const blob = await response.blob();
	return new File([blob], item.fileName, { type: blob.type });
}

export async function fetchAPIClaimWork(workId: string): Promise<string> {
	const response = await postJson(`/work/${workId}/claim`);
	expectOk(response, 'Could not start queued work');
	return ((await response.json()) as { token: string }).token;
}

export async function fetchAPIWorkProgress(
	workId: string,
	token: string,
	completed: number,
	total: number
): Promise<void> {
	const response = await postJson(`/work/${workId}/progress`, {
		token,
		completed,
		total
	});
	expectOk(response, 'Could not report scan progress');
}

export async function fetchAPICompleteWork(
	workId: string,
	token: string,
	cards: ImportedCard[]
): Promise<void> {
	const response = await postJson(`/work/${workId}/complete`, {
		token,
		cards
	});
	expectOk(response, 'Could not add identified cards');
}

export async function fetchAPIFailWork(
	workId: string,
	token: string,
	error: string
): Promise<void> {
	await postJson(`/work/${workId}/fail`, { token, error });
}

export async function fetchAPIRetryWork(workId: string): Promise<void> {
	expectOk(
		await postJson(`/work/${workId}/retry`),
		'Could not retry this item'
	);
}

export async function fetchAPIDeleteWork(workId: string): Promise<void> {
	const response = await request(`/work/${workId}`, { method: 'DELETE' });
	if (!response.ok && response.status !== 404)
		throw new Error('Could not remove this item');
}
