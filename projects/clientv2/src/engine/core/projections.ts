import { boardCards } from '@torimtg/core';
import type { DeckBoard, DeckState, EventEnvelope, Query, WorkState } from '@torimtg/core';
import type { Dataset } from './types';
import { cardFields, identityOf, overviewOf, type CardCatalog } from './card-catalog';
import type { BlobUrlResolver } from '../ports';
import { artworkFor, deckArtworkUrls, type ImageSidecars } from './image-sidecars';
import { manaCostColors } from '../../domain/deck/deck-colors';

function art(deck: DeckState, cards: CardCatalog): string | null {
    return deck.art || identityOf(cards[deck.bannerCardUuid || ''])?.art || identityOf(cards[Object.keys(deck.cards)[0]])?.art || null;
}

function boardEntries(deck: DeckState, board: DeckBoard, cards: CardCatalog): unknown[] {
    return Object.entries(boardCards(deck, board)).map((entry) => {
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

function blend(deck: DeckState, blobs: BlobUrlResolver): unknown {
    if (!deck.bannerBlend) return null;
    return { config: deck.bannerBlend.config, images: { desktop: blobs.url(deck.bannerBlend.images.desktop), mobile: blobs.url(deck.bannerBlend.images.mobile), tile: blobs.url(deck.bannerBlend.images.tile) } };
}

export function projectQuery(data: Dataset, cards: CardCatalog, sidecars: ImageSidecars, blobs: BlobUrlResolver, query: Query): unknown {
    const states = data.states.filter((state) => !state.deleted);
    switch (query.type) {
        case 'decks': return states.filter((state): state is DeckState => state.kind === 'deck').map((deck) => {
            const deckArt = art(deck, cards);
            return { deckId: deck.id, name: deck.name, art: deckArt, artwork: artworkFor([deckArt], sidecars), bannerBlend: blend(deck, blobs), colors: colors(deck, cards), tags: deck.tags ?? [], createdAt: deck.createdAt, updatedAt: deck.updatedAt };
        });
        case 'deck': {
            const deck = states.find((state) => state.id === query.id);
            if (deck?.kind !== 'deck') return null;
            const banner = identityOf(cards[deck.bannerCardUuid || '']);
            const icon = art(deck, cards);
            const main = boardEntries(deck, 'main', cards) as Array<{ art?: string | null }>;
            // The sidecars of the images shown first travel with the deck, so its first paint is complete.
            const artwork = artworkFor(deckArtworkUrls({ icon, bannerCard: banner, cards: main }), sidecars);
            return { name: deck.name, icon, artwork, bannerCardUuid: deck.bannerCardUuid, bannerCard: banner, palette: deck.palette, bannerCrop: deck.bannerCrop, bannerBlend: blend(deck, blobs), topStyle: deck.topStyle, boardVisualization: deck.boardVisualization ?? null, lastEdit: deck.updatedAt, cards: main, sideboard: boardEntries(deck, 'side', cards), notes: notes(deck), tags: deck.tags ?? [] };
        }
        case 'collections': return states.filter((state) => state.kind === 'collection').map((state) => ({ collection_id: state.id, name: 'name' in state ? state.name : '' }));
        case 'locations': return states.filter((state) => state.kind === 'location').map((state) => ({ storage_location_id: state.id, name: 'name' in state ? state.name : '' }));
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
