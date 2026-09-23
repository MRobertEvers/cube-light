/**
 * Card data arrives in different shapes depending on the source. Each shape is kept
 * separately per printing so a thinner shape never overwrites or stands in for a richer one.
 * `details` includes every `overview` field; `printing` is a small, separate subset.
 */
export type CardShape = 'printing' | 'overview' | 'details';

/** One entry of /cards/printings: enough to pick a printing, not to place it in a deck. */
export type PrintingCard = {
    uuid: string; name: string; setCode: string; setName: string | null;
    /** The normal-size image, unlike the small `image` of the other shapes. */
    image: string | null; art: string | null;
};

type CardImages = { small: string; normal: string; large: string; art_crop: string };

/** The deck overview row: the sync catalog and /sync/v1/resolve-card. */
export type OverviewCard = {
    uuid: string; name: string; scryfallId: string; setCode: string;
    types: string; subtypes: string; manaCost: string; text: string;
    type: string | null; rarity: string | null; power: string | null; toughness: string | null;
    loyalty: string | null; defense: string | null; number: string | null; artist: string | null;
    flavorText: string | null; legalities: Record<string, string>;
    image?: string; images?: CardImages; art?: string;
};

/** /cards/details: the overview plus every set the card was printed in. */
export type DetailedCard = Omit<OverviewCard, 'image' | 'art'> & {
    sets: Array<[string, string]>;
    image: string | null; highResImage: string | null; art: string | null;
};

type ShapeData = { printing: PrintingCard; overview: OverviewCard; details: DetailedCard };

export type CatalogEntry = { uuid: string } & { [shape in CardShape]?: ShapeData[shape] };
export type CardCatalog = Record<string, CatalogEntry>;

/** The shape each source returns. A source that returns anything else is not recorded. */
export const SOURCE_SHAPES = {
    sync: 'overview',
    'card.resolve': 'overview',
    'card.details': 'details',
    'card.printings': 'printing'
} as const satisfies Record<string, CardShape>;
export type CardSource = keyof typeof SOURCE_SHAPES;

function isText(value: unknown): value is string { return typeof value === 'string'; }

/** Checks the fields that distinguish each shape; the rest are trusted from the server's type. */
export function hasShape<S extends CardShape>(shape: S, value: unknown): value is ShapeData[S] {
    const card = value as Record<string, unknown> | null;
    if (!card || typeof card !== 'object' || !isText(card.uuid) || !isText(card.name) || !isText(card.setCode)) return false;
    if (shape === 'printing') return true;
    const overview = isText(card.types) && isText(card.manaCost) && isText(card.text);
    if (shape === 'overview') return overview;
    return overview && Array.isArray(card.sets) && 'highResImage' in card;
}

export function isCardSource(type: string): type is CardSource { return type in SOURCE_SHAPES; }

/** Records `value` (one card or a list) under the shape its source declares. */
export function recordCards(catalog: CardCatalog, source: CardSource, value: unknown): void {
    const shape = SOURCE_SHAPES[source];
    for (const card of Array.isArray(value) ? value : value ? [value] : []) {
        if (!hasShape(shape, card)) continue;
        const entry = catalog[card.uuid] ||= { uuid: card.uuid };
        (entry as Record<CardShape, unknown>)[shape] = card;
    }
}

/** Types, mana cost and rules text: what a deck needs to file a card. */
export function overviewOf(entry: CatalogEntry | undefined): OverviewCard | null {
    if (entry?.overview) return entry.overview;
    if (!entry?.details) return null;
    const details = entry.details;
    const overview: OverviewCard = cardFields(details);
    if ('images' in details) overview.images = details.images;
    if (details.image) overview.image = details.image;
    if (details.art) overview.art = details.art;
    return overview;
}

/** The fields every overview and details card shares, apart from its images. */
export function cardFields(card: Omit<OverviewCard, 'image' | 'images' | 'art'>): Omit<OverviewCard, 'image' | 'images' | 'art'> {
    return {
        uuid: card.uuid, name: card.name, scryfallId: card.scryfallId, setCode: card.setCode,
        types: card.types, subtypes: card.subtypes, manaCost: card.manaCost, text: card.text,
        type: card.type, rarity: card.rarity, power: card.power, toughness: card.toughness,
        loyalty: card.loyalty, defense: card.defense, number: card.number, artist: card.artist,
        flavorText: card.flavorText, legalities: card.legalities
    };
}

/**
 * The /cards/details answer. A synced overview carries the same card and image URLs, so it
 * stands in offline; only the printed-in `sets` list is unknown and left out.
 */
export function detailsOf(entry: CatalogEntry | undefined): DetailedCard | Omit<DetailedCard, 'sets'> | null {
    if (entry?.details) return entry.details;
    const overview = entry?.overview;
    if (!overview) return null;
    const details: Omit<DetailedCard, 'sets'> = {
        uuid: overview.uuid, name: overview.name, scryfallId: overview.scryfallId, setCode: overview.setCode,
        types: overview.types, subtypes: overview.subtypes, manaCost: overview.manaCost, text: overview.text,
        type: overview.type, rarity: overview.rarity, power: overview.power, toughness: overview.toughness,
        loyalty: overview.loyalty, defense: overview.defense, number: overview.number, artist: overview.artist,
        flavorText: overview.flavorText, legalities: overview.legalities,
        image: overview.images?.small ?? overview.image ?? null, highResImage: overview.images?.normal ?? null, art: overview.images?.art_crop ?? overview.art ?? null
    };
    if ('images' in overview) details.images = overview.images;
    return details;
}

/** Name, set and artwork, from whichever shape is present. */
export function identityOf(entry: CatalogEntry | undefined): { uuid: string; name: string; setCode: string; art: string | null } | null {
    const card = overviewOf(entry) || entry?.printing;
    return card ? { uuid: card.uuid, name: card.name, setCode: card.setCode, art: card.art ?? null } : null;
}
