import { CardDatabase, DetailedCardInfo } from '../database/cards/CardDatabase';
import { cardImageUrl, ImageVariant } from '../images/card-images';

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

	// URLs served by this server.
	image?: string;
	images?: Record<ImageVariant, string>;
	art?: string;
};

export async function getDeckOverviewCardInfo(
	uuids: string[],
	cardDatabase: CardDatabase,
	imageBaseUrl: string
): Promise<Array<DeckOverviewCardInfo>> {
	const cards = await cardDatabase.getCardDataByUuids(uuids);

	const cardMap = cards.reduce(
		(map, item) => {
			map[item.uuid] = item;
			return map;
		},
		{} as Record<string, DetailedCardInfo>
	);

	return uuids.map((uuid) => {
		const baseCard = cardMap[uuid];
		const small = cardImageUrl(imageBaseUrl, baseCard.scryfallId, 'small');
		const images = small
			? {
					small,
					normal: cardImageUrl(
						imageBaseUrl,
						baseCard.scryfallId,
						'normal'
					)!,
					large: cardImageUrl(
						imageBaseUrl,
						baseCard.scryfallId,
						'large'
					)!,
					art_crop: cardImageUrl(
						imageBaseUrl,
						baseCard.scryfallId,
						'art_crop'
					)!
				}
			: undefined;

		return {
			...baseCard,
			image: images?.small,
			images,
			art: images?.art_crop
		};
	});
}
