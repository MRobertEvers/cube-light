import { DomainError } from './types.js';
import type { AggregateState, CardEdit, CardQuantityChange, CollectionState, DomainCommand, DomainEvent, DeckBoard, DeckGroup, DeckState, LocationState, PlacementMove, ProfileState, WorkState, Crop } from './types.js';

export const MAX_DECK_TAGS = 32;
export const MAX_TAG_LENGTH = 40;
export const MAX_DECK_GROUPS = 50;
export const MAX_GROUP_NAME_LENGTH = 80;
export const MAX_CARD_EDITS = 2000;
export const MAX_LOCATION_DESCRIPTION_LENGTH = 500;

/** A tag as it is stored: trimmed, with runs of whitespace collapsed to one space. */
export function normalizeTag(tag: string): string {
    return tag.trim().replace(/\s+/g, ' ');
}

/** Tags are the same tag when they match ignoring case. */
export function tagKey(tag: string): string {
    return normalizeTag(tag).toLowerCase();
}

/** Stored tags, in the order given, without blanks or repeats. The first spelling of a repeat wins. */
export function normalizeTags(tags: readonly string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const tag of tags) {
        const normalized = normalizeTag(tag);
        const key = normalized.toLowerCase();
        if (!normalized || seen.has(key)) continue;
        seen.add(key);
        result.push(normalized);
    }
    return result;
}

/** Whether a deck with these tags belongs in the group. A group without tags holds no decks. */
export function deckInGroup(deckTags: readonly string[] | undefined, group: Pick<DeckGroup, 'tags' | 'match'>): boolean {
    if (!group.tags.length) return false;
    const held = new Set((deckTags || []).map(tagKey));
    const wanted = group.tags.map(tagKey);
    return group.match === 'all' ? wanted.every((key) => held.has(key)) : wanted.some((key) => held.has(key));
}

/** The quantities one board of a deck holds, by printing UUID. */
export function boardCards(deck: DeckState, board: DeckBoard): Record<string, number> {
    return board === 'side' ? deck.sideboard || {} : deck.cards;
}

/** The copies a collection holds, by printing UUID. */
export function collectionCards(collection: CollectionState): Record<string, number> {
    return collection.cards || {};
}

/** Copies of a printing kept in any location. */
export function placedCount(collection: CollectionState, uuid: string): number {
    const byLocation = collection.stored?.[uuid];
    if (!byLocation) return 0;
    return Object.values(byLocation).reduce((total, count) => total + count, 0);
}

/** Copies of a printing held but not kept in any location. */
export function unplacedCount(collection: CollectionState, uuid: string): number {
    return Math.max(0, (collectionCards(collection)[uuid] || 0) - placedCount(collection, uuid));
}

function requireValue(condition: unknown, message: string): asserts condition {
    if (!condition) throw new DomainError(message);
}

function validName(value: unknown): asserts value is string {
    requireValue(typeof value === 'string' && value.trim().length > 0 && value.length <= 1024, 'Enter a name (1-1024 characters).');
}

function validNoteId(value: unknown): asserts value is string {
    requireValue(typeof value === 'string' && isPublicId(value, 'note'), 'Invalid note ID.');
}

function validTags(value: unknown): asserts value is string[] {
    requireValue(Array.isArray(value) && value.length <= MAX_DECK_TAGS, `A deck may have at most ${MAX_DECK_TAGS} tags.`);
    for (const tag of value) requireValue(typeof tag === 'string' && normalizeTag(tag).length > 0 && normalizeTag(tag).length <= MAX_TAG_LENGTH, `Enter each tag as 1-${MAX_TAG_LENGTH} characters.`);
}

function validDeckGroups(value: unknown): asserts value is DeckGroup[] {
    requireValue(Array.isArray(value) && value.length <= MAX_DECK_GROUPS, `You may have at most ${MAX_DECK_GROUPS} deck groups.`);
    const ids = new Set<string>();
    for (const group of value as DeckGroup[]) {
        requireValue(group && typeof group === 'object' && typeof group.groupId === 'string' && isPublicId(group.groupId, 'group') && !ids.has(group.groupId), 'Invalid deck group ID.');
        ids.add(group.groupId);
        requireValue(typeof group.name === 'string' && group.name.trim().length > 0 && group.name.trim().length <= MAX_GROUP_NAME_LENGTH, `Enter a group name (1-${MAX_GROUP_NAME_LENGTH} characters).`);
        validTags(group.tags);
        requireValue(normalizeTags(group.tags).length > 0, 'Choose at least one tag for each group.');
        requireValue(group.match === 'any' || group.match === 'all', 'Invalid group match.');
    }
}

function validCardEdit(edit: CardEdit): void {
    requireValue(edit && typeof edit.uuid === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(edit.uuid) && !['__proto__', 'constructor', 'prototype'].includes(edit.uuid), 'Invalid card ID.');
    requireValue(['add', 'remove', 'set'].includes(edit.action) && Number.isSafeInteger(edit.count) && edit.count >= 0 && edit.count <= 1000000, 'Invalid card quantity.');
}

/** Applies one edit to a quantity table in place. */
function applyCardEdit(cards: Record<string, number>, edit: CardEdit): void {
    const previous = cards[edit.uuid] || 0;
    const resulting = edit.action === 'set' ? edit.count : edit.action === 'add' ? previous + edit.count : Math.max(0, previous - edit.count);
    requireValue(Number.isSafeInteger(resulting) && resulting <= 1000000, 'Card quantity is too large.');
    cards[edit.uuid] = resulting;
}

/** The changes between two quantity tables, sorted by UUID. */
function quantityChanges(before: Record<string, number>, after: Record<string, number>): CardQuantityChange[] {
    return Object.keys(after).filter((key) => (before[key] || 0) !== after[key]).sort().map((uuid) => {
        const previous = before[uuid] || 0;
        return { uuid, previous, delta: after[uuid] - previous, resulting: after[uuid] };
    });
}

function validPlacementMove(move: PlacementMove): void {
    requireValue(move && typeof move.uuid === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(move.uuid) && !['__proto__', 'constructor', 'prototype'].includes(move.uuid), 'Invalid card ID.');
    requireValue(move.from === null || isPublicId(move.from, 'location'), 'Invalid storage location.');
    requireValue(move.to === null || isPublicId(move.to, 'location'), 'Invalid storage location.');
    requireValue(move.from !== move.to, 'Choose a different storage location.');
    requireValue(Number.isSafeInteger(move.count) && move.count >= 1 && move.count <= 1000000, 'Invalid card quantity.');
}

/** Applies placement moves to a copy of a collection, checking each one has the copies it moves. */
function placeCards(collection: CollectionState, moves: readonly PlacementMove[]): CollectionState {
    const next = structuredClone(collection);
    for (const move of moves) {
        validPlacementMove(move);
        const stored = (next.stored ||= {});
        const byLocation = (stored[move.uuid] ||= {});
        const available = move.from === null ? unplacedCount(next, move.uuid) : byLocation[move.from] || 0;
        requireValue(available >= move.count, 'There are not enough copies to move.');
        if (move.from !== null) {
            byLocation[move.from] -= move.count;
            if (!byLocation[move.from]) delete byLocation[move.from];
        }
        if (move.to !== null) byLocation[move.to] = (byLocation[move.to] || 0) + move.count;
        // Nothing placed is stored as absent so the collection hashes like one that never placed anything.
        if (!Object.keys(byLocation).length) delete stored[move.uuid];
        if (!Object.keys(stored).length) delete next.stored;
    }
    return next;
}

/**
 * Moves copies back to the unplaced pool wherever the new quantities hold fewer copies than are placed.
 * Takes from the location keeping the most copies first; ties go to the lower location ID.
 */
function trimPlacements(collection: CollectionState, after: Record<string, number>): PlacementMove[] {
    const moves: PlacementMove[] = [];
    for (const uuid of Object.keys(collection.stored || {}).sort()) {
        let surplus = placedCount(collection, uuid) - (after[uuid] || 0);
        const byLocation = collection.stored![uuid];
        const order = Object.keys(byLocation).sort((a, b) => byLocation[b] - byLocation[a] || (a < b ? -1 : a > b ? 1 : 0));
        for (const location of order) {
            if (surplus <= 0) break;
            const count = Math.min(surplus, byLocation[location]);
            moves.push({ uuid, from: location, to: null, count });
            surplus -= count;
        }
    }
    return moves;
}

function validDescription(value: unknown): asserts value is string | undefined {
    requireValue(value === undefined || (typeof value === 'string' && value.length <= MAX_LOCATION_DESCRIPTION_LENGTH), `Enter a description of at most ${MAX_LOCATION_DESCRIPTION_LENGTH} characters.`);
}

function validCrop(crop: Crop, maxXArg?: number): boolean {
    const maxX = maxXArg === undefined ? 1 : maxXArg;
    return !!crop && Number.isFinite(crop.x) && crop.x >= 0 && crop.x <= maxX && Number.isFinite(crop.y) && crop.y >= 0 && crop.y <= 1
        && Number.isFinite(crop.zoom) && crop.zoom >= 1 && crop.zoom <= 3;
}

export function isPublicId(id: string, kind: string): boolean {
    return typeof id === 'string' && new RegExp(`^${kind}_[A-Za-z0-9_-]{16}$`).test(id);
}

export function decide(state: AggregateState | null, command: DomainCommand): DomainEvent[] {
    requireValue(command && typeof command.type === 'string' && typeof command.id === 'string', 'Invalid command.');
    const kind = command.type.split('.')[0];
    requireValue(['deck', 'collection', 'location', 'profile', 'work'].includes(kind), 'Unknown command.');
    requireValue(kind === 'profile' ? /^profile_[1-9][0-9]*$/.test(command.id) : isPublicId(command.id, kind), 'Invalid aggregate ID.');
    requireValue(!state || (state.id === command.id && state.kind === kind), 'Aggregate identity mismatch.');
    requireValue(!state?.deleted, 'This item has been deleted.');
    if (command.type.endsWith('.create') || command.type === 'work.queue') requireValue(!state, 'This item already exists.');
    else if (kind !== 'profile') requireValue(state, 'This item is not available on this device.');
    switch (command.type) {
        case 'deck.create': validName(command.name); return [{ type: 'DeckCreated', name: command.name.trim() }];
        case 'deck.details': {
            validName(command.name);
            requireValue(command.bannerCardUuid === undefined || /^[A-Za-z0-9_-]{1,128}$/.test(command.bannerCardUuid), 'Invalid card ID.');
            requireValue(command.art === undefined || (typeof command.art === 'string' && command.art.length <= 2048 && /^(https?:\/\/|\/)/.test(command.art)), 'Invalid artwork.');
            const deck = state as DeckState;
            if (deck.name === command.name.trim() && (command.bannerCardUuid === undefined || deck.bannerCardUuid === command.bannerCardUuid) && (command.art === undefined || command.art === deck.art)) return [];
            const changed: Extract<DomainEvent, { type: 'DeckDetailsChanged' }> = { type: 'DeckDetailsChanged', name: command.name.trim() };
            if (command.bannerCardUuid !== undefined) changed.bannerCardUuid = command.bannerCardUuid;
            if (command.art !== undefined) changed.art = command.art;
            return [changed];
        }
        case 'deck.cards': {
            requireValue(Array.isArray(command.edits) && command.edits.length <= MAX_CARD_EDITS, `An edit may contain at most ${MAX_CARD_EDITS} card changes.`);
            const deck = state as DeckState;
            const after: Record<DeckBoard, Record<string, number>> = { main: Object.fromEntries(Object.entries(deck.cards)), side: Object.fromEntries(Object.entries(boardCards(deck, 'side'))) };
            for (const edit of command.edits) {
                validCardEdit(edit);
                requireValue(edit.board === undefined || edit.board === 'main' || edit.board === 'side', 'Invalid deck board.');
                applyCardEdit(after[edit.board || 'main'], edit);
            }
            // Main-board changes come first and carry no board, matching events recorded before boards existed.
            const changes: CardQuantityChange[] = quantityChanges(deck.cards, after.main);
            for (const change of quantityChanges(boardCards(deck, 'side'), after.side)) {
                change.board = 'side';
                changes.push(change);
            }
            return changes.length ? [{ type: 'CardQuantitiesAdjusted', changes }] : [];
        }
        case 'deck.palette': {
            const palette = command.palette;
            requireValue(palette === null || (!!palette && typeof palette === 'object' && !Array.isArray(palette) && Object.keys(palette).length === 4 && ['accent', 'surface', 'wash', 'border'].every((key) => /^#[a-f0-9]{6}$/i.test(palette[key as keyof typeof palette]))), 'Invalid palette.');
            return [{ type: 'DeckPaletteSelected', palette }];
        }
        case 'deck.crop': requireValue(command.crop && validCrop(command.crop.desktop, 1.12) && validCrop(command.crop.mobile, 1.12), 'Invalid banner crop.'); return [{ type: 'DeckCropSelected', crop: command.crop }];
        case 'deck.style': requireValue(['card', 'full-art'].includes(command.topStyle), 'Invalid deck style.'); return [{ type: 'DeckStyleSelected', topStyle: command.topStyle }];
        // Clients own the list of visualizations and fall back on ids they don't know.
        case 'deck.visualization': requireValue(typeof command.boardVisualization === 'string' && /^[a-z0-9-]{1,40}$/.test(command.boardVisualization), 'Invalid board visualization.'); return (state as DeckState).boardVisualization === command.boardVisualization ? [] : [{ type: 'DeckVisualizationSelected', boardVisualization: command.boardVisualization }];
        case 'deck.blend': {
            const blend = command.blend;
            requireValue(blend && typeof blend.source === 'string' && blend.source.length <= 2048 && blend.crop && validCrop(blend.crop.desktop, 1.12) && validCrop(blend.crop.mobile, 1.12), 'Invalid blend source.');
            requireValue(blend.images && ['desktop', 'mobile', 'tile'].every((variant) => /^blob_[a-f0-9]{64}$/.test(blend.images[variant as keyof typeof blend.images])), 'Save banner images before saving their recipe.');
            requireValue(blend.config && typeof blend.config === 'object' && JSON.stringify(blend.config).length <= 96 * 1024, 'Invalid blend configuration.');
            const config = blend.config;
            requireValue(['multiband', 'poisson', 'fade'].includes(config.method) && typeof config.contentAware === 'boolean' && /^#[a-f0-9]{6}$/i.test(config.surface) && Number.isFinite(config.position) && config.position >= .35 && config.position <= .55 && Number.isFinite(config.width) && config.width >= .08 && config.width <= .24 && Number.isInteger(config.version) && config.version >= 1 && config.version <= 1000 && Number.isInteger(config.feather) && config.feather >= 1 && config.feather <= 12 && typeof config.protectSubject === 'boolean' && Number.isFinite(config.decontamination) && config.decontamination >= 0 && config.decontamination <= 1, 'Invalid blend settings.');
            if (config.protection) {
                const protection = config.protection;
                requireValue(typeof protection.source === 'string' && protection.source.length <= 2048 && Array.isArray(protection.strokes) && protection.strokes.length <= 64, 'Invalid subject protection.');
                requireValue(!protection.rect || Object.values(protection.rect).every((value) => Number.isFinite(value) && value >= 0 && value <= 1), 'Invalid subject rectangle.');
                for (const stroke of protection.strokes) requireValue(['foreground', 'background'].includes(stroke.label) && Number.isFinite(stroke.radius) && stroke.radius > 0 && stroke.radius <= .25 && Array.isArray(stroke.points) && stroke.points.length >= 2 && stroke.points.length <= 1024 && stroke.points.length % 2 === 0 && stroke.points.every((point) => Number.isFinite(point) && point >= 0 && point <= 1), 'Invalid subject stroke.');
            }
            return [{ type: 'DeckBlendGenerated', blend }];
        }
        case 'deck.note': {
            validNoteId(command.noteId);
            requireValue(typeof command.text === 'string' && command.text.trim().length > 0 && command.text.length <= 20000, 'Enter a note (1-20000 characters).');
            if ((state as DeckState).notes?.[command.noteId]?.text === command.text) return [];
            return [{ type: 'DeckNoteSaved', noteId: command.noteId, text: command.text }];
        }
        case 'deck.noteDelete':
            validNoteId(command.noteId);
            return (state as DeckState).notes?.[command.noteId] ? [{ type: 'DeckNoteDeleted', noteId: command.noteId }] : [];
        case 'deck.tags': {
            validTags(command.tags);
            const tags = normalizeTags(command.tags);
            return canonicalJson(tags) === canonicalJson((state as DeckState).tags || []) ? [] : [{ type: 'DeckTagsSet', tags }];
        }
        case 'deck.delete': return [{ type: 'DeckDeleted' }];
        case 'collection.create': validName(command.name); return [{ type: 'CollectionCreated', name: command.name.trim() }];
        case 'location.create': validName(command.name); return [{ type: 'StorageLocationCreated', name: command.name.trim() }];
        case 'collection.rename': validName(command.name); return [{ type: 'CollectionRenamed', name: command.name.trim() }];
        case 'location.rename': validName(command.name); return [{ type: 'StorageLocationRenamed', name: command.name.trim() }];
        case 'collection.role':
            requireValue(command.role === 'owned' || command.role === 'wanted', 'Invalid collection role.');
            return ((state as CollectionState).role || 'owned') === command.role ? [] : [{ type: 'CollectionRoleSet', role: command.role }];
        case 'collection.cards': {
            requireValue(Array.isArray(command.edits) && command.edits.length <= MAX_CARD_EDITS, `An edit may contain at most ${MAX_CARD_EDITS} card changes.`);
            const collection = state as CollectionState;
            const before = collectionCards(collection);
            const after = Object.fromEntries(Object.entries(before));
            for (const edit of command.edits) {
                validCardEdit(edit);
                requireValue(edit.board === undefined, 'A collection has no boards.');
                applyCardEdit(after, edit);
            }
            const changes = quantityChanges(before, after);
            if (!changes.length) return [];
            // Copies leave their locations before they leave the collection, so no event leaves more placed than held.
            const trim = trimPlacements(collection, after);
            const events: DomainEvent[] = trim.length ? [{ type: 'CollectionCardsPlaced', moves: trim }] : [];
            events.push({ type: 'CollectionCardsAdjusted', changes });
            return events;
        }
        case 'collection.place': {
            requireValue(Array.isArray(command.moves) && command.moves.length > 0 && command.moves.length <= MAX_CARD_EDITS, `A move may contain 1-${MAX_CARD_EDITS} changes.`);
            const moves = command.moves.map((move) => ({ uuid: move.uuid, from: move.from, to: move.to, count: move.count }));
            placeCards(state as CollectionState, moves);
            return [{ type: 'CollectionCardsPlaced', moves }];
        }
        case 'collection.delete': return [{ type: 'CollectionDeleted' }];
        case 'location.describe': {
            validName(command.name);
            validDescription(command.description);
            const location = state as LocationState;
            const name = command.name.trim();
            const description = command.description === undefined ? undefined : command.description.trim() || undefined;
            if (location.name === name && location.description === description) return [];
            const described: Extract<DomainEvent, { type: 'StorageLocationDescribed' }> = { type: 'StorageLocationDescribed', name };
            if (description !== undefined) described.description = description;
            return [described];
        }
        case 'location.delete': return [{ type: 'StorageLocationDeleted' }];
        case 'profile.artwork': {
            requireValue(Number.isSafeInteger(command.userId) && command.userId > 0 && command.id === `profile_${command.userId}`, 'Invalid profile identity.');
            const profile = command.profile;
            requireValue(profile && typeof profile.cardName === 'string' && profile.cardName.length <= 256 && typeof profile.cardUuid === 'string' && profile.cardUuid.length <= 128 && typeof profile.art === 'string' && /^(https?:\/\/|\/)/.test(profile.art) && profile.art.length <= 4096 && validCrop(profile.crop), 'Invalid profile artwork.');
            return [{ type: 'ProfileArtworkSelected', userId: command.userId, profile }];
        }
        case 'profile.printingView': requireValue(command.id === `profile_${command.userId}` && ['compact', 'grid'].includes(command.printingView), 'Invalid preference.'); return [{ type: 'PrintingViewPreferenceSet', userId: command.userId, printingView: command.printingView }];
        case 'profile.deckGroups': {
            requireValue(Number.isSafeInteger(command.userId) && command.userId > 0 && command.id === `profile_${command.userId}`, 'Invalid profile identity.');
            validDeckGroups(command.deckGroups);
            const deckGroups: DeckGroup[] = command.deckGroups.map((group) => ({ groupId: group.groupId, name: group.name.trim(), tags: normalizeTags(group.tags), match: group.match }));
            return canonicalJson(deckGroups) === canonicalJson((state as ProfileState | null)?.deckGroups || []) ? [] : [{ type: 'DeckGroupsSet', userId: command.userId, deckGroups }];
        }
        case 'work.queue':
            requireValue(isPublicId(command.deckId, 'deck') && typeof command.fileName === 'string' && command.fileName.length <= 255 && /^image\/(jpeg|png|webp|heic|heif|gif)$/.test(command.contentType) && /^blob_[a-f0-9]{64}$/.test(command.blobId) && ['card-aware', 'paddle-only'].includes(command.pipeline), 'Invalid scan.');
            return [{ type: 'ScanQueued', deckId: command.deckId, fileName: command.fileName, contentType: command.contentType, blobId: command.blobId, pipeline: command.pipeline }];
        case 'work.start': requireValue(['pending', 'running'].includes((state as WorkState).status), 'Scan is already finished.'); return [{ type: 'ScanStarted' }];
        case 'work.progress': requireValue(Number.isSafeInteger(command.completed) && Number.isSafeInteger(command.total) && command.completed >= 0 && command.completed <= command.total, 'Invalid progress.'); return [];
        case 'work.complete': requireValue((state as WorkState).status === 'running' && Array.isArray(command.edits), 'Scan is not running.'); return [{ type: 'ScanCompleted', cardsAdded: command.edits.reduce((count, edit) => count + edit.count, 0) }];
        case 'work.fail': requireValue(typeof command.error === 'string' && command.error.length <= 500, 'Invalid scan error.'); return [{ type: 'ScanFailed', error: command.error }];
        case 'work.release': return (state as WorkState).status === 'running' ? [{ type: 'ScanReleased' }] : [];
        case 'work.retry': requireValue((state as WorkState).status === 'failed', 'Only a failed scan can be retried.'); return [{ type: 'ScanRetried' }];
        case 'work.delete': return [{ type: 'ScanDeleted' }];
        default: throw new DomainError('Unsupported command version.');
    }
}

export function applyEvent(state: AggregateState | null, event: DomainEvent, id: string, at: string): AggregateState {
    switch (event.type) {
        case 'DeckImportedFromLegacy': case 'CollectionImportedFromLegacy': case 'StorageLocationImportedFromLegacy': case 'ProfileImportedFromLegacy': case 'WorkImportedFromLegacy':
            requireValue(!state && event.state.id === id, 'Invalid opening balance.'); return structuredClone(event.state);
        case 'DeckCreated': requireValue(!state, 'Duplicate creation event.'); return { id, deleted: false, createdAt: at, updatedAt: at, kind: 'deck', name: event.name, cards: {}, art: null, bannerCardUuid: null, palette: null, bannerCrop: null, topStyle: 'card', bannerBlend: null };
        case 'CollectionCreated': case 'StorageLocationCreated': requireValue(!state, 'Duplicate creation event.'); return { id, deleted: false, createdAt: at, updatedAt: at, kind: event.type === 'CollectionCreated' ? 'collection' : 'location', name: event.name };
        case 'ProfileArtworkSelected': case 'PrintingViewPreferenceSet': case 'DeckGroupsSet': {
            const profile: ProfileState = state?.kind === 'profile' ? structuredClone(state) : { id, deleted: false, createdAt: at, updatedAt: at, kind: 'profile', userId: event.userId, profile: null, printingView: 'grid' };
            if (event.type === 'ProfileArtworkSelected') profile.profile = event.profile;
            else if (event.type === 'PrintingViewPreferenceSet') profile.printingView = event.printingView;
            // No groups are stored as absent so the profile hashes like one that never had any.
            else if (event.deckGroups.length) profile.deckGroups = structuredClone(event.deckGroups);
            else delete profile.deckGroups;
            profile.updatedAt = at;
            return profile;
        }
        case 'ScanQueued': requireValue(!state, 'Duplicate scan.'); return { id, deleted: false, createdAt: at, updatedAt: at, kind: 'work', deckId: event.deckId, fileName: event.fileName, contentType: event.contentType, blobId: event.blobId, pipeline: event.pipeline, status: 'pending', completed: 0, total: 0, cardsAdded: 0, error: null };
    }
    requireValue(state && !state.deleted, 'Event has no live aggregate.');
    const next = structuredClone(state);
    next.updatedAt = at;
    if (next.kind === 'deck') {
        switch (event.type) {
            case 'DeckDetailsChanged': next.name = event.name; if (event.art !== undefined) next.art = event.art; if (event.bannerCardUuid !== undefined) next.bannerCardUuid = event.bannerCardUuid; return next;
            case 'CardQuantitiesAdjusted':
                for (const change of event.changes) {
                    requireValue(change.board === undefined || change.board === 'side', 'Invalid deck board.');
                    const cards = change.board === 'side' ? (next.sideboard ||= {}) : next.cards;
                    requireValue((cards[change.uuid] || 0) === change.previous && change.previous + change.delta === change.resulting && Number.isSafeInteger(change.resulting) && change.resulting >= 0, 'Card ledger does not balance.');
                    if (change.resulting) cards[change.uuid] = change.resulting; else delete cards[change.uuid];
                }
                // An empty side board is stored as absent so it hashes like a deck that never had one.
                if (next.sideboard && !Object.keys(next.sideboard).length) delete next.sideboard;
                return next;
            case 'DeckPaletteSelected': next.palette = event.palette; return next;
            case 'DeckCropSelected': next.bannerCrop = event.crop; return next;
            case 'DeckStyleSelected': next.topStyle = event.topStyle; return next;
            case 'DeckVisualizationSelected': next.boardVisualization = event.boardVisualization; return next;
            case 'DeckBlendGenerated': next.bannerBlend = event.blend; return next;
            case 'DeckNoteSaved': {
                const notes = (next.notes ||= {});
                notes[event.noteId] = { text: event.text, createdAt: notes[event.noteId]?.createdAt || at, updatedAt: at };
                return next;
            }
            case 'DeckNoteDeleted':
                if (next.notes) delete next.notes[event.noteId];
                // No notes are stored as absent so the deck hashes like one that never had any.
                if (next.notes && !Object.keys(next.notes).length) delete next.notes;
                return next;
            case 'DeckTagsSet':
                // No tags are stored as absent so the deck hashes like one that never had any.
                if (event.tags.length) next.tags = event.tags.slice(); else delete next.tags;
                return next;
            case 'DeckDeleted': next.deleted = true; return next;
        }
    }
    if (next.kind === 'collection') {
        switch (event.type) {
            case 'CollectionRenamed': next.name = event.name; return next;
            // Owned is stored as absent so the collection hashes like one made before roles existed.
            case 'CollectionRoleSet': if (event.role === 'owned') delete next.role; else next.role = event.role; return next;
            case 'CollectionCardsAdjusted': {
                const cards = (next.cards ||= {});
                for (const change of event.changes) {
                    requireValue(change.board === undefined, 'A collection has no boards.');
                    requireValue((cards[change.uuid] || 0) === change.previous && change.previous + change.delta === change.resulting && Number.isSafeInteger(change.resulting) && change.resulting >= 0, 'Card ledger does not balance.');
                    if (change.resulting) cards[change.uuid] = change.resulting; else delete cards[change.uuid];
                    requireValue(placedCount(next, change.uuid) <= change.resulting, 'More copies are placed than held.');
                }
                // An empty collection is stored without cards so it hashes like one that never had any.
                if (!Object.keys(cards).length) delete next.cards;
                return next;
            }
            case 'CollectionCardsPlaced': {
                const placed = placeCards(next, event.moves);
                placed.updatedAt = at;
                return placed;
            }
            case 'CollectionDeleted': next.deleted = true; return next;
        }
    }
    if (next.kind === 'location') {
        switch (event.type) {
            case 'StorageLocationRenamed': next.name = event.name; return next;
            case 'StorageLocationDescribed':
                next.name = event.name;
                if (event.description === undefined) delete next.description; else next.description = event.description;
                return next;
            case 'StorageLocationDeleted': next.deleted = true; return next;
        }
    }
    if (next.kind === 'work') {
        switch (event.type) {
            case 'ScanStarted': next.status = 'running'; return next;
            case 'ScanReleased': case 'ScanRetried': next.status = 'pending'; next.completed = 0; next.total = 0; next.error = null; return next;
            case 'ScanCompleted': next.status = 'completed'; next.cardsAdded = event.cardsAdded; next.completed = next.total; return next;
            case 'ScanFailed': next.status = 'failed'; next.error = event.error; return next;
            case 'ScanDeleted': next.deleted = true; return next;
        }
    }
    throw new DomainError('Unsupported event for this aggregate.');
}

export function preview(state: AggregateState | null, command: DomainCommand, at: string): AggregateState | null {
    return decide(state, command).reduce<AggregateState | null>((value, event) => applyEvent(value, event, command.id, at), state);
}

export function canonicalJson(value: unknown): string {
    if (value === null || typeof value !== 'object') {
        const serialized = JSON.stringify(value);
        if (serialized === undefined) throw new DomainError('Undefined value in durable data.');
        return serialized;
    }
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(',')}}`;
}
