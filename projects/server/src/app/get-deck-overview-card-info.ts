import { CardDatabase, DetailedCardInfo } from '../database/cards/CardDatabase';
import { fetchCardDataByScryFallIds, ScryfallCardInfo } from '../external/scryfall';

function scryfallId(card: ScryfallCardInfo): string {
	return card.id;
}

async function fetchImages(scryfallIds: string[]): Promise<Array<ScryfallCardInfo>> {
	return scryfallIds.length > 0 ? (await fetchCardDataByScryFallIds(scryfallIds)).data : [];
}

export type DeckOverviewCardInfo = {
	// From DetailedCardInfo
	name: string;
	uuid: string;
	scryfallId: string;
	types: string; // Comma separated types above.
	subtypes: string;
	manaCost: string; // {X}{W}
	text: string;
	setCode: string;

	// From Scryfall;
	image?: string;
	art?: string;
};

export async function getDeckOverviewCardInfo(
	uuids: string[],
	cardDatabase: CardDatabase
): Promise<Array<DeckOverviewCardInfo>> {
	const cards = await cardDatabase.getCardDataByUuids(uuids);

	const cardMap = cards.reduce((map, item) => {
		map[item.uuid] = item;
		return map;
	}, {} as Record<string, DetailedCardInfo>);

	const cardImages = await fetchImages(cards.map((card) => card.scryfallId));

	const cardImagesMapped = cardImages.reduce((map, scryfallCard) => {
		map[scryfallId(scryfallCard)] = scryfallCard;
		return map;
	}, {} as Record<string, ScryfallCardInfo>);

	return uuids.map((uuid) => {
		const baseCard = cardMap[uuid];
		const images = cardImagesMapped[baseCard.scryfallId];

		return {
			...baseCard,
			image: images?.image_uris.small,
			art: images?.image_uris.art_crop
		};
	});
}
