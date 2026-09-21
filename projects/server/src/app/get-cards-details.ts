import { CardDatabase } from '../database/cards/CardDatabase';
import { getDeckOverviewCardInfo } from './get-deck-overview-card-info';

export type CompleteCardInfo = {
	// From DetailedCardInfo
	name: string;
	uuid: string;
	scryfallId: string;
	types: string; // Comma separated types above.
	subtypes: string;
	manaCost: string; // {X}{W}
	text: string;
	setCode: string;

	sets: Array<[string, string]>;

	// URLs served by this server.
	image: string | null;
	highResImage: string | null;
	art: string | null;
};

export async function getCardsDetails(
	uuids: string[],
	cardDatabase: CardDatabase,
	imageBaseUrl: string
): Promise<Array<CompleteCardInfo>> {
	const cards = await getDeckOverviewCardInfo(
		uuids,
		cardDatabase,
		imageBaseUrl
	);

	const cardSets: Record<string, Array<[string, string]>> = {};
	for (const card of cards) {
		cardSets[card.uuid] = await cardDatabase.getCardSets(card.name);
	}

	return cards.map((card) => {
		const { uuid } = card;
		const sets = cardSets[uuid];

		return {
			...card,
			sets: sets,
			highResImage: card.images?.normal || null,
			image: card.images?.small || null,
			art: card.images?.art_crop || null
		};
	});
}
