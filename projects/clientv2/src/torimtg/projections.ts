import { boardCards } from '@torimtg/core';
import type { DeckBoard, DeckState, EventEnvelope, Query, WorkState } from '@torimtg/core';
import type { Dataset } from './types';
import { identityOf, overviewOf, type CardCatalog } from './card-catalog';

let resolveBlobUrl: ((id: string) => string | null) | null = null;

// The service worker answers /__tori_blob/ from its fetch handler. Without one
// the window resolves the same ids to object URLs instead.
export function setBlobUrlResolver(resolver: ((id: string) => string | null) | null): void { resolveBlobUrl = resolver; }

export function blobUrl(id: string): string { return (id && resolveBlobUrl?.(id)) || `/__tori_blob/${id}`; }

function art(deck: DeckState, cards: CardCatalog): string | null {
    return deck.art || identityOf(cards[deck.bannerCardUuid || ''])?.art || identityOf(cards[Object.keys(deck.cards)[0]])?.art || null;
}

function boardEntries(deck: DeckState, board: DeckBoard, cards: CardCatalog): unknown[] {
    return Object.entries(boardCards(deck, board)).map((entry) => {
        const [uuid, count] = entry;
        const overview = overviewOf(cards[uuid]);
        if (overview) return { ...overview, uuid, count, board };
        // Without an overview the card's type is unknown; a printing still names it.
        const printing = cards[uuid]?.printing;
        return { name: printing?.name || uuid, types: 'Unknown', manaCost: '', image: printing?.image || '', art: printing?.art || '', setCode: printing?.setCode || '', text: '', legalities: {}, uuid, count, board };
    });
}

function notes(deck: DeckState): unknown[] {
    return Object.entries(deck.notes || {}).map((entry) => ({ noteId: entry[0], ...entry[1] })).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function blend(deck: DeckState): unknown {
    if (!deck.bannerBlend) return null;
    return { config: deck.bannerBlend.config, images: { desktop: blobUrl(deck.bannerBlend.images.desktop), mobile: blobUrl(deck.bannerBlend.images.mobile), tile: blobUrl(deck.bannerBlend.images.tile) } };
}

export function projectQuery(data: Dataset, cards: CardCatalog, query: Query): unknown {
    const states = data.states.filter((state) => !state.deleted);
    switch (query.type) {
        case 'decks': return states.filter((state): state is DeckState => state.kind === 'deck').map((deck) => ({ deckId: deck.id, name: deck.name, art: art(deck, cards), bannerBlend: blend(deck), createdAt: deck.createdAt, updatedAt: deck.updatedAt }));
        case 'deck': {
            const deck = states.find((state) => state.id === query.id);
            if (deck?.kind !== 'deck') return null;
            const banner = identityOf(cards[deck.bannerCardUuid || '']);
            return { name: deck.name, icon: art(deck, cards), bannerCardUuid: deck.bannerCardUuid, bannerCard: banner, palette: deck.palette, bannerCrop: deck.bannerCrop, bannerBlend: blend(deck), topStyle: deck.topStyle, boardVisualization: deck.boardVisualization ?? null, lastEdit: deck.updatedAt, cards: boardEntries(deck, 'main', cards), sideboard: boardEntries(deck, 'side', cards), notes: notes(deck) };
        }
        case 'collections': return states.filter((state) => state.kind === 'collection').map((state) => ({ collection_id: state.id, name: 'name' in state ? state.name : '' }));
        case 'locations': return states.filter((state) => state.kind === 'location').map((state) => ({ storage_location_id: state.id, name: 'name' in state ? state.name : '' }));
        case 'profile': return states.find((state) => state.kind === 'profile') || null;
        case 'work': return { items: states.filter((state): state is WorkState => state.kind === 'work').map((item) => {
            const deck = states.find((state) => state.id === item.deckId);
            return { workId: item.id, kind: 'card-image-ocr', deck: deck?.kind === 'deck' ? { deckId: deck.id, name: deck.name } : null, status: item.status, fileName: item.fileName, pipeline: item.pipeline, progress: { completed: item.completed, total: item.total }, cardsAdded: item.cardsAdded, error: item.error, imageUrl: blobUrl(item.blobId), createdAt: item.createdAt, updatedAt: item.updatedAt };
        }) };
        case 'history': {
            const deck = states.find((state) => state.id === query.id);
            return { deckId: query.id, deckName: deck?.kind === 'deck' ? deck.name : '', edits: [...data.events.filter((event) => event.aggregateId === query.id).sort((a, b) => b.aggregateSequence - a.aggregateSequence).map((event) => historyEntry(event, cards)).filter(Boolean), ...(data.legacyHistory || [])] };
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
    else if (event.type === 'DeckBlendGenerated') entry.details.push({ field: 'bannerBlend', before: null, after: JSON.stringify(event.blend.config) });
    else return null;
    return entry;
}
