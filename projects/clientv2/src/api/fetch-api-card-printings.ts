import { API_URI } from '../config/api-url';

export type CardPrinting = {
	name: string;
	uuid: string;
	setCode: string;
	art: string | null;
};

export async function fetchAPICardPrintings(name: string, signal?: AbortSignal): Promise<CardPrinting[]> {
	const query = new URLSearchParams({ name });
	const response = await fetch(`${API_URI}/cards/printings?${query}`, { signal });
	if (!response.ok) throw new Error(`Unable to load printings (${response.status})`);
	return response.json() as Promise<CardPrinting[]>;
}
