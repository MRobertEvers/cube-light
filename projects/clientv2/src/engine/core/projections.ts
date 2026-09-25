import { boardCards } from '@torimtg/core';
import type { AggregateState, CollectionState, DeckBoard, DeckState, EventEnvelope, LocationState, Placements, Query, WorkState } from '@torimtg/core';
import type { Dataset } from './types';
import { cardFields, identityOf, overviewOf, type CardCatalog } from './card-catalog';
import type { BlobUrlResolver } from '../ports';
import { artworkFor, deckArtworkUrls, type ImageSidecars } from './image-sidecars';
import { manaCostColors } from '../../domain/deck/deck-colors';
import { artworkKey } from '../../domain/appearance/banner-blend';
import { ownedNameKey } from '../../domain/library/ownership';
import type { OwnedPrinting, Ownership } from '../../domain/models/library';

function art(deck: DeckState, cards: CardCatalog): string | null {
    return deck.art || identityOf(cards[deck.bannerCardUuid || ''])?.art || identityOf(cards[Object.keys(deck.cards)[0]])?.art || null;
}

function boardEntries(deck: DeckState, board: DeckBoard, cards: CardCatalog): unknown[] {
    return quantityEntries(boardCards(deck, board), board, cards);
}

/** One deck-style entry per printing in `quantities`, filed under `board`. */
function quantityEntries(quantities: Record<string, number>, board: DeckBoard, cards: CardCatalog): unknown[] {
    return Object.entries(quantities).map((entry) => {
        const [uuid, count] = entry;
        const overview = overviewOf(cards[uuid]);
        if (overview) {
            const row: Record<string, unknown> = cardFields(overview);
            if ('image' in overview) row.image = overview.image;
            if ('images' in overview) row.images = overview.images;
            if ('art' in overview) row.art = overview.art;
            row.uuid = uuid;
            row.count = count;
            row.board = board;
            return row;
        }
        // Without an overview the card's type is unknown; a printing still names it.
        const printing = cards[uuid]?.printing;
        return { name: printing?.name || uuid, types: 'Unknown', manaCost: '', image: printing?.image || '', art: printing?.art || '', setCode: printing?.setCode || '', text: '', legalities: {}, uuid, count, board };
    });
}

/** The colors of the main board's mana costs. Cards not yet described on this device add none. */
function colors(deck: DeckState, cards: CardCatalog): string[] {
    return manaCostColors(Object.keys(deck.cards).map((uuid) => overviewOf(cards[uuid])?.manaCost ?? ''));
}

function notes(deck: DeckState): unknown[] {
    return Object.entries(deck.notes || {}).map((entry) => ({ noteId: entry[0], text: entry[1].text, createdAt: entry[1].createdAt, updatedAt: entry[1].updatedAt })).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** The same artwork whether its URL is absolute, relative, or behind the /api prefix. */
function sameArtwork(a: string, b: string): boolean {
    return artworkKey(a).replace(/^\/api\//, '/') === artworkKey(b).replace(/^\/api\//, '/');
}

/**
 * The deck's rendered banner blend, while it was rendered from the banner's current art. A
 * banner card chosen offline cannot be rendered yet; the plain art shows until it is.
 */
function blend(deck: DeckState, currentArt: string | null, blobs: BlobUrlResolver): unknown {
    if (!deck.bannerBlend) return null;
    if (currentArt && !sameArtwork(deck.bannerBlend.source, currentArt)) return null;
    return { config: deck.bannerBlend.config, images: { desktop: blobs.url(deck.bannerBlend.images.desktop), mobile: blobs.url(deck.bannerBlend.images.mobile), tile: blobs.url(deck.bannerBlend.images.tile) } };
}

export function projectQuery(data: Dataset, cards: CardCatalog, sidecars: ImageSidecars, blobs: BlobUrlResolver, query: Query): unknown {
    const states = data.states.filter((state) => !state.deleted);
    switch (query.type) {
        case 'decks': return states.filter((state): state is DeckState => state.kind === 'deck').map((deck) => {
            const deckArt = art(deck, cards);
            return { deckId: deck.id, name: deck.name, art: deckArt, artwork: artworkFor([deckArt], sidecars), bannerBlend: blend(deck, deckArt, blobs), colors: colors(deck, cards), tags: deck.tags ?? [], createdAt: deck.createdAt, updatedAt: deck.updatedAt };
        });
        case 'deck': {
            const deck = states.find((state) => state.id === query.id);
            if (deck?.kind !== 'deck') return null;
            const banner = identityOf(cards[deck.bannerCardUuid || '']);
            const icon = art(deck, cards);
            const main = boardEntries(deck, 'main', cards) as Array<{ art?: string | null }>;
            // The sidecars of the images shown first travel with the deck, so its first paint is complete.
            const artwork = artworkFor(deckArtworkUrls({ icon, bannerCard: banner, cards: main }), sidecars);
            return { name: deck.name, icon, artwork, bannerCardUuid: deck.bannerCardUuid, bannerCard: banner, palette: deck.palette, bannerCrop: deck.bannerCrop, bannerBlend: blend(deck, icon, blobs), topStyle: deck.topStyle, boardVisualization: deck.boardVisualization ?? null, lastEdit: deck.updatedAt, cards: main, sideboard: boardEntries(deck, 'side', cards), notes: notes(deck), tags: deck.tags ?? [] };
        }
        case 'collections': {
            const locations = liveLocations(states);
            return collectionsIn(states).map((collection) => collectionSummary(collection, locations, cards));
        }
        case 'collection': {
            const collection = states.find((state) => state.id === query.id);
            if (collection?.kind !== 'collection') return null;
            return collectionDetail(collection, liveLocations(states), cards);
        }
        case 'locations': {
            const collections = collectionsIn(states);
            return states.filter((state): state is LocationState => state.kind === 'location').map((location) => locationSummary(location, collections));
        }
        case 'location': {
            const location = states.find((state) => state.id === query.id);
            if (location?.kind !== 'location') return null;
            return locationDetail(location, collectionsIn(states), cards);
        }
        case 'ownership': return ownership(states, cards);
        case 'profile': return states.find((state) => state.kind === 'profile') || null;
        case 'work': return { items: states.filter((state): state is WorkState => state.kind === 'work').map((item) => {
            const deck = states.find((state) => state.id === item.deckId);
            return { workId: item.id, kind: 'card-image-ocr', deck: deck?.kind === 'deck' ? { deckId: deck.id, name: deck.name } : null, status: item.status, fileName: item.fileName, pipeline: item.pipeline, progress: { completed: item.completed, total: item.total }, cardsAdded: item.cardsAdded, error: item.error, imageUrl: blobs.url(item.blobId), createdAt: item.createdAt, updatedAt: item.updatedAt };
        }) };
        case 'history': {
            const deck = states.find((state) => state.id === query.id);
            return { deckId: query.id, deckName: deck?.kind === 'deck' ? deck.name : '', edits: data.events.filter((event) => event.aggregateId === query.id).sort((a, b) => b.aggregateSequence - a.aggregateSequence).map((event) => historyEntry(event, cards)).filter(Boolean).concat(data.legacyHistory || []) };
        }
        case 'resource': return null;
    }
}

function collectionsIn(states: AggregateState[]): CollectionState[] {
    return states.filter((state): state is CollectionState => state.kind === 'collection');
}

function liveLocations(states: AggregateState[]): Set<string> {
    return new Set(states.filter((state) => state.kind === 'location').map((state) => state.id));
}

function sumOf(values: Iterable<number>): number {
    let total = 0;
    for (const value of values) total += value;
    return total;
}

/** Placements in locations that still exist; the rest count as unplaced. */
function livePlacements(collection: CollectionState, locations: Set<string>): { stored: Placements; orphaned: Record<string, number> } {
    const stored: Placements = {};
    const orphaned: Record<string, number> = {};
    for (const entry of Object.entries(collection.stored || {})) {
        const uuid = entry[0];
        for (const placed of Object.entries(entry[1])) {
            if (locations.has(placed[0])) (stored[uuid] ||= {})[placed[0]] = placed[1];
            else orphaned[uuid] = (orphaned[uuid] || 0) + placed[1];
        }
    }
    return { stored, orphaned };
}

function unplacedIn(collection: CollectionState, stored: Placements): number {
    return sumOf(Object.entries(collection.cards || {}).map((entry) => Math.max(0, entry[1] - sumOf(Object.values(stored[entry[0]] || {})))));
}

function collectionSummary(collection: CollectionState, locations: Set<string>, cards: CardCatalog): unknown {
    const held = collection.cards || {};
    const uuids = Object.keys(held);
    const names = new Set(uuids.map((uuid) => identityOf(cards[uuid])?.name).filter((name): name is string => !!name));
    const mostHeld = uuids.slice().sort((a, b) => held[b] - held[a] || (a < b ? -1 : 1)).find((uuid) => identityOf(cards[uuid])?.art);
    return {
        collectionId: collection.id, name: collection.name, role: collection.role || 'owned',
        copies: sumOf(Object.values(held)), names: names.size, unplaced: unplacedIn(collection, livePlacements(collection, locations).stored),
        colors: manaCostColors(uuids.map((uuid) => overviewOf(cards[uuid])?.manaCost ?? '')),
        art: mostHeld ? identityOf(cards[mostHeld])?.art ?? null : null,
        createdAt: collection.createdAt, updatedAt: collection.updatedAt
    };
}

function collectionDetail(collection: CollectionState, locations: Set<string>, cards: CardCatalog): unknown {
    const placements = livePlacements(collection, locations);
    return {
        collectionId: collection.id, name: collection.name, role: collection.role || 'owned',
        cards: quantityEntries(collection.cards || {}, 'main', cards), stored: placements.stored,
        copies: sumOf(Object.values(collection.cards || {})), unplaced: unplacedIn(collection, placements.stored),
        orphaned: placements.orphaned, updatedAt: collection.updatedAt
    };
}

/** Copies each collection keeps in `locationId`: collection ID → UUID → copies. */
function keptIn(locationId: string, collections: CollectionState[]): Map<CollectionState, Record<string, number>> {
    const kept = new Map<CollectionState, Record<string, number>>();
    for (const collection of collections) {
        const here: Record<string, number> = {};
        for (const entry of Object.entries(collection.stored || {})) if (entry[1][locationId]) here[entry[0]] = entry[1][locationId];
        if (Object.keys(here).length) kept.set(collection, here);
    }
    return kept;
}

function locationSummary(location: LocationState, collections: CollectionState[]): unknown {
    const kept = keptIn(location.id, collections);
    return {
        locationId: location.id, name: location.name, description: location.description ?? null,
        copies: sumOf(Array.from(kept.values()).map((here) => sumOf(Object.values(here)))),
        collections: Array.from(kept.keys()).map((collection) => ({ collectionId: collection.id, name: collection.name }))
    };
}

function locationDetail(location: LocationState, collections: CollectionState[], cards: CardCatalog): unknown {
    const merged: Record<string, number> = {};
    const sources: Record<string, Record<string, number>> = {};
    const names: Record<string, string> = {};
    for (const entry of keptIn(location.id, collections)) {
        names[entry[0].id] = entry[0].name;
        for (const held of Object.entries(entry[1])) {
            merged[held[0]] = (merged[held[0]] || 0) + held[1];
            (sources[held[0]] ||= {})[entry[0].id] = held[1];
        }
    }
    return { locationId: location.id, name: location.name, description: location.description ?? null, cards: quantityEntries(merged, 'main', cards), sources, collections: names, copies: sumOf(Object.values(merged)) };
}

/**
 * Every card across collections and decks. Printings this device has not described yet are
 * kept by UUID but left out of the names, until the catalog describes them.
 */
function ownership(states: AggregateState[], cards: CardCatalog): Ownership {
    const locations = liveLocations(states);
    const byUuid: Record<string, OwnedPrinting> = {};
    for (const collection of collectionsIn(states)) {
        const wanted = collection.role === 'wanted';
        const stored = livePlacements(collection, locations).stored;
        for (const entry of Object.entries(collection.cards || {})) {
            const uuid = entry[0];
            const identity = identityOf(cards[uuid]);
            const printing = byUuid[uuid] ||= { uuid, name: identity?.name ?? '', setCode: identity?.setCode ?? '', owned: 0, wanted: 0, byCollection: {}, byLocation: {} };
            if (wanted) { printing.wanted += entry[1]; continue; }
            printing.owned += entry[1];
            printing.byCollection[collection.id] = (printing.byCollection[collection.id] || 0) + entry[1];
            let placed = 0;
            for (const kept of Object.entries(stored[uuid] || {})) {
                printing.byLocation[kept[0]] = (printing.byLocation[kept[0]] || 0) + kept[1];
                placed += kept[1];
            }
            if (entry[1] > placed) printing.byLocation[''] = (printing.byLocation[''] || 0) + entry[1] - placed;
        }
    }
    const byName: Ownership['byName'] = {};
    function nameEntry(name: string) {
        return byName[ownedNameKey(name)] ||= { name, owned: 0, wanted: 0, uuids: [], inDecks: {} };
    }
    for (const printing of Object.values(byUuid)) {
        if (!printing.name) continue;
        const entry = nameEntry(printing.name);
        entry.owned += printing.owned;
        entry.wanted += printing.wanted;
        if (printing.owned > 0) entry.uuids.push(printing.uuid);
    }
    for (const entry of Object.values(byName)) entry.uuids.sort((a, b) => byUuid[b].owned - byUuid[a].owned || (a < b ? -1 : 1));
    for (const deck of states) {
        if (deck.kind !== 'deck') continue;
        for (const board of ['main', 'side'] as const) for (const held of Object.entries(boardCards(deck, board))) {
            const name = identityOf(cards[held[0]])?.name;
            if (!name) continue;
            const entry = nameEntry(name);
            entry.inDecks[deck.id] = (entry.inDecks[deck.id] || 0) + held[1];
        }
    }
    return { byUuid, byName };
}

function historyEntry(envelope: EventEnvelope, cards: CardCatalog): unknown {
    const event = envelope.event;
    const entry = { id: envelope.aggregateSequence, createdAt: envelope.recordedAt, cardsIn: [] as unknown[], cardsOut: [] as unknown[], details: [] as unknown[] };
    if (event.type === 'CardQuantitiesAdjusted') {
        for (const change of event.changes) (change.delta > 0 ? entry.cardsIn : entry.cardsOut).push({ uuid: change.uuid, name: identityOf(cards[change.uuid])?.name || null, count: Math.abs(change.delta), board: change.board || 'main' });
    } else if (event.type === 'DeckDetailsChanged' || event.type === 'DeckCreated') entry.details.push({ field: 'name', before: null, after: event.name });
    else if (event.type === 'DeckPaletteSelected') entry.details.push({ field: 'palette', before: null, after: JSON.stringify(event.palette) });
    else if (event.type === 'DeckCropSelected') entry.details.push({ field: 'bannerCrop', before: null, after: JSON.stringify(event.crop) });
    else if (event.type === 'DeckStyleSelected') entry.details.push({ field: 'topStyle', before: null, after: event.topStyle });
    else if (event.type === 'DeckVisualizationSelected') entry.details.push({ field: 'boardVisualization', before: null, after: event.boardVisualization });
    else if (event.type === 'DeckNoteSaved') entry.details.push({ field: 'note', before: null, after: event.text });
    else if (event.type === 'DeckNoteDeleted') entry.details.push({ field: 'note', before: null, after: null });
    else if (event.type === 'DeckTagsSet') entry.details.push({ field: 'tags', before: null, after: event.tags.length ? event.tags.join(', ') : null });
    else if (event.type === 'DeckBlendGenerated') entry.details.push({ field: 'bannerBlend', before: null, after: JSON.stringify(event.blend.config) });
    else return null;
    return entry;
}
