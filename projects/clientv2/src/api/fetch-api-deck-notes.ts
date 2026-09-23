import { API_URI } from '../config/api-url';
import { apiFetch } from './utils';

async function send(path: string, init: RequestInit, failure: string) {
	const response = await apiFetch(`${API_URI}${path}`, init);
	if (!response.ok) throw new Error(`${failure} (${response.status})`);
	return response;
}

export async function fetchAPICreateDeckNote(
	deckId: string,
	text: string
): Promise<string> {
	const response = await send(
		`/decks/${deckId}/notes`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ text })
		},
		'Unable to save note'
	);
	return ((await response.json()) as { noteId: string }).noteId;
}

export async function fetchAPIUpdateDeckNote(
	deckId: string,
	noteId: string,
	text: string
): Promise<void> {
	await send(
		`/decks/${deckId}/notes/${noteId}`,
		{
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ text })
		},
		'Unable to save note'
	);
}

export async function fetchAPIDeleteDeckNote(
	deckId: string,
	noteId: string
): Promise<void> {
	await send(
		`/decks/${deckId}/notes/${noteId}`,
		{ method: 'DELETE' },
		'Unable to delete note'
	);
}
