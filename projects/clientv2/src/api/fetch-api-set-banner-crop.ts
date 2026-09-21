import { API_URI } from '../config/api-url';
import { apiFetch } from './utils';
import type { BannerCrop } from '../utils/banner-crop';

export async function fetchAPISetBannerCrop(
	deckId: string,
	bannerCrop: BannerCrop
): Promise<void> {
	const response = await apiFetch(`${API_URI}/decks/${deckId}/banner-crop`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ bannerCrop })
	});
	if (!response.ok)
		throw new Error(`Unable to save banner crop (${response.status})`);
}
