import fetch from 'node-fetch';

const SCRYFALL_API = `https://api.scryfall.com/cards/collection`;

type ScryfallApiResponse = {
	data: Array<{
		id: string;
		image_uris: {
			small: string;
			art_crop: string;
		};
	}>;
};

export async function fetchCardDataByScryFallIds(ids: string[]): Promise<ScryfallApiResponse> {
	const requestBody = JSON.stringify({
		identifiers: ids.map((id) => {
			return {
				id
			};
		})
	});

	const resp = await fetch(SCRYFALL_API, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: requestBody
	});

	return resp.json();
}

export async function fetchImageByScryFallId(id: string): Promise<Buffer | null> {
	const scryfallData = await fetchCardDataByScryFallIds([id]);

	if (scryfallData.data.length === 0) {
		return null;
	}

	const cardData = scryfallData.data[0];

	const imageData = await fetch(cardData.image_uris.small);

	return imageData.buffer();
}
