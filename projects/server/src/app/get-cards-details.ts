import { CardDatabase, DetailedCardInfo } from '../database/cards/CardDatabase';
import { fetchCardDataByScryFallIds, ScryfallCardInfo } from '../external/scryfall';
import { getDeckOverviewCardInfo } from './get-deck-overview-card-info';

function scryfallId(card: ScryfallCardInfo): string {
	return card.id;
}

async function fetchImages(scryfallIds: string[]): Promise<Array<ScryfallCardInfo>> {
	return scryfallIds.length > 0 ? (await fetchCardDataByScryFallIds(scryfallIds)).data : [];
}

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

	// From Scryfall;
	image?: string;
	art?: string;
};

export async function getCardsDetails(
	uuids: string[],
	cardDatabase: CardDatabase
): Promise<Array<CompleteCardInfo>> {
	const cards = await getDeckOverviewCardInfo(uuids, cardDatabase);

	const cardSets: Record<string, Array<[string, string]>> = {};
	for (const card of cards) {
		cardSets[card.uuid] = await cardDatabase.getCardSets(card.name);
	}

	return cards.map((card) => {
		const { uuid } = card;
		const sets = cardSets[uuid];

		return {
			...card,
			sets: sets
		};
	});
}
