import {
	CardDatabase,
	CardRulesInfo,
	DetailedCardInfo
} from '../database/cards/CardDatabase';
import { CardFace, cardImageUrl, ImageVariant } from '../images/card-images';

/** Layouts printed on two faces, each with an image of its own (Scryfall's `back` images). Split,
 * adventure, flip and the like are one face; a meld card's other half is another card. */
const DOUBLE_FACED_LAYOUTS = new Set(['transform', 'modal_dfc', 'reversible_card']);

/** Every size of one face's image, as this server serves them. */
function faceImages(
	imageBaseUrl: string,
	scryfallId: string,
	face: CardFace
): Record<ImageVariant, string> | undefined {
	const small = cardImageUrl(imageBaseUrl, scryfallId, 'small', face);
	if (!small) return undefined;
	return {
		small,
		normal: cardImageUrl(imageBaseUrl, scryfallId, 'normal', face)!,
		large: cardImageUrl(imageBaseUrl, scryfallId, 'large', face)!,
		art_crop: cardImageUrl(imageBaseUrl, scryfallId, 'art_crop', face)!
	};
}

export type DeckOverviewCardInfo = Omit<CardRulesInfo, 'uuid'> & {
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
	/** The back face's images, for a double-faced printing only. */
	backImages?: Record<ImageVariant, string>;
	art?: string;
};

export async function getDeckOverviewCardInfo(
	uuids: string[],
	cardDatabase: CardDatabase,
	imageBaseUrl: string
): Promise<Array<DeckOverviewCardInfo>> {
	const cards = await cardDatabase.getCardDataByUuids(uuids);
	// Load preview text with the deck, so opening a card needs no extra request.
	const rules = new Map(
		(await cardDatabase.getCardRulesByUuids(uuids)).map((row) => [
			row.uuid,
			row
		])
	);

	const cardMap = cards.reduce(
		(map, item) => {
			map[item.uuid] = item;
			return map;
		},
		{} as Record<string, DetailedCardInfo>
	);

	return uuids.map((uuid) => {
		const baseCard = cardMap[uuid];
		const cardRules = rules.get(uuid) ?? {
			uuid,
			type: null,
			rarity: null,
			power: null,
			toughness: null,
			loyalty: null,
			defense: null,
			number: null,
			artist: null,
			flavorText: null,
			legalities: {}
		};
		const images = faceImages(imageBaseUrl, baseCard.scryfallId, 'front');
		const backImages =
			baseCard.layout && DOUBLE_FACED_LAYOUTS.has(baseCard.layout)
				? faceImages(imageBaseUrl, baseCard.scryfallId, 'back')
				: undefined;

		const card: DeckOverviewCardInfo = {
			name: baseCard.name,
			uuid: baseCard.uuid,
			scryfallId: baseCard.scryfallId,
			types: baseCard.types,
			subtypes: baseCard.subtypes,
			manaCost: baseCard.manaCost,
			text: baseCard.text,
			setCode: baseCard.setCode,
			type: cardRules.type,
			rarity: cardRules.rarity,
			power: cardRules.power,
			toughness: cardRules.toughness,
			loyalty: cardRules.loyalty,
			defense: cardRules.defense,
			number: cardRules.number,
			artist: cardRules.artist,
			flavorText: cardRules.flavorText,
			legalities: cardRules.legalities,
			image: images?.small,
			images,
			art: images?.art_crop
		};
		// Only on double-faced printings, so other cards' records stay as they were.
		if (backImages) card.backImages = backImages;
		return card;
	});
}
