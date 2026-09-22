import { DomainError } from './types.js';
import type { AggregateState, DomainCommand, DomainEvent, DeckState, WorkState, Crop } from './types.js';

function requireValue(condition: unknown, message: string): asserts condition {
    if (!condition) throw new DomainError(message);
}

function validName(value: unknown): asserts value is string {
    requireValue(typeof value === 'string' && value.trim().length > 0 && value.length <= 1024, 'Enter a name (1-1024 characters).');
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
            return [{ type: 'DeckDetailsChanged', name: command.name.trim(), ...(command.bannerCardUuid === undefined ? {} : { bannerCardUuid: command.bannerCardUuid }), ...(command.art === undefined ? {} : { art: command.art }) }];
        }
        case 'deck.cards': {
            requireValue(Array.isArray(command.edits) && command.edits.length <= 2000, 'An edit may contain at most 2000 card changes.');
            const before = (state as DeckState).cards;
            const after = { ...before };
            for (const edit of command.edits) {
                requireValue(edit && typeof edit.uuid === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(edit.uuid) && !['__proto__', 'constructor', 'prototype'].includes(edit.uuid), 'Invalid card ID.');
                requireValue(['add', 'remove', 'set'].includes(edit.action) && Number.isSafeInteger(edit.count) && edit.count >= 0 && edit.count <= 1000000, 'Invalid card quantity.');
                const previous = after[edit.uuid] || 0;
                const resulting = edit.action === 'set' ? edit.count : edit.action === 'add' ? previous + edit.count : Math.max(0, previous - edit.count);
                requireValue(Number.isSafeInteger(resulting) && resulting <= 1000000, 'Card quantity is too large.');
                after[edit.uuid] = resulting;
            }
            const changes = Object.keys(after).filter((uuid) => (before[uuid] || 0) !== after[uuid]).sort().map((uuid) => ({ uuid, previous: before[uuid] || 0, delta: after[uuid] - (before[uuid] || 0), resulting: after[uuid] }));
            return changes.length ? [{ type: 'CardQuantitiesAdjusted', changes }] : [];
        }
        case 'deck.palette': {
            const palette = command.palette;
            requireValue(palette === null || (!!palette && typeof palette === 'object' && !Array.isArray(palette) && Object.keys(palette).length === 4 && ['accent', 'surface', 'wash', 'border'].every((key) => /^#[a-f0-9]{6}$/i.test(palette[key as keyof typeof palette]))), 'Invalid palette.');
            return [{ type: 'DeckPaletteSelected', palette }];
        }
        case 'deck.crop': requireValue(command.crop && validCrop(command.crop.desktop, 1.12) && validCrop(command.crop.mobile, 1.12), 'Invalid banner crop.'); return [{ type: 'DeckCropSelected', crop: command.crop }];
        case 'deck.style': requireValue(['card', 'full-art'].includes(command.topStyle), 'Invalid deck style.'); return [{ type: 'DeckStyleSelected', topStyle: command.topStyle }];
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
        case 'deck.delete': return [{ type: 'DeckDeleted' }];
        case 'collection.create': validName(command.name); return [{ type: 'CollectionCreated', name: command.name.trim() }];
        case 'location.create': validName(command.name); return [{ type: 'StorageLocationCreated', name: command.name.trim() }];
        case 'collection.rename': validName(command.name); return [{ type: 'CollectionRenamed', name: command.name.trim() }];
        case 'location.rename': validName(command.name); return [{ type: 'StorageLocationRenamed', name: command.name.trim() }];
        case 'profile.artwork': {
            requireValue(Number.isSafeInteger(command.userId) && command.userId > 0 && command.id === `profile_${command.userId}`, 'Invalid profile identity.');
            const profile = command.profile;
            requireValue(profile && typeof profile.cardName === 'string' && profile.cardName.length <= 256 && typeof profile.cardUuid === 'string' && profile.cardUuid.length <= 128 && typeof profile.art === 'string' && /^(https?:\/\/|\/)/.test(profile.art) && profile.art.length <= 4096 && validCrop(profile.crop), 'Invalid profile artwork.');
            return [{ type: 'ProfileArtworkSelected', userId: command.userId, profile }];
        }
        case 'profile.printingView': requireValue(command.id === `profile_${command.userId}` && ['compact', 'grid'].includes(command.printingView), 'Invalid preference.'); return [{ type: 'PrintingViewPreferenceSet', userId: command.userId, printingView: command.printingView }];
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
    const common = { id, deleted: false, createdAt: at, updatedAt: at };
    switch (event.type) {
        case 'DeckImportedFromLegacy': case 'CollectionImportedFromLegacy': case 'StorageLocationImportedFromLegacy': case 'ProfileImportedFromLegacy': case 'WorkImportedFromLegacy':
            requireValue(!state && event.state.id === id, 'Invalid opening balance.'); return structuredClone(event.state);
        case 'DeckCreated': requireValue(!state, 'Duplicate creation event.'); return { ...common, kind: 'deck', name: event.name, cards: {}, art: null, bannerCardUuid: null, palette: null, bannerCrop: null, topStyle: 'card', bannerBlend: null };
        case 'CollectionCreated': case 'StorageLocationCreated': requireValue(!state, 'Duplicate creation event.'); return { ...common, kind: event.type === 'CollectionCreated' ? 'collection' : 'location', name: event.name };
        case 'ProfileArtworkSelected': case 'PrintingViewPreferenceSet': {
            const profile = state?.kind === 'profile' ? state : { ...common, kind: 'profile' as const, userId: event.userId, profile: null, printingView: 'grid' as const };
            return event.type === 'ProfileArtworkSelected' ? { ...profile, profile: event.profile, updatedAt: at } : { ...profile, printingView: event.printingView, updatedAt: at };
        }
        case 'ScanQueued': requireValue(!state, 'Duplicate scan.'); return { ...common, kind: 'work', deckId: event.deckId, fileName: event.fileName, contentType: event.contentType, blobId: event.blobId, pipeline: event.pipeline, status: 'pending', completed: 0, total: 0, cardsAdded: 0, error: null };
    }
    requireValue(state && !state.deleted, 'Event has no live aggregate.');
    const next = structuredClone(state);
    next.updatedAt = at;
    if (next.kind === 'deck') {
        switch (event.type) {
            case 'DeckDetailsChanged': next.name = event.name; if (event.art !== undefined) next.art = event.art; if (event.bannerCardUuid !== undefined) next.bannerCardUuid = event.bannerCardUuid; return next;
            case 'CardQuantitiesAdjusted':
                for (const change of event.changes) {
                    requireValue((next.cards[change.uuid] || 0) === change.previous && change.previous + change.delta === change.resulting && Number.isSafeInteger(change.resulting) && change.resulting >= 0, 'Card ledger does not balance.');
                    if (change.resulting) next.cards[change.uuid] = change.resulting; else delete next.cards[change.uuid];
                }
                return next;
            case 'DeckPaletteSelected': next.palette = event.palette; return next;
            case 'DeckCropSelected': next.bannerCrop = event.crop; return next;
            case 'DeckStyleSelected': next.topStyle = event.topStyle; return next;
            case 'DeckBlendGenerated': next.bannerBlend = event.blend; return next;
            case 'DeckDeleted': next.deleted = true; return next;
        }
    }
    if (next.kind === 'collection' && event.type === 'CollectionRenamed') { next.name = event.name; return next; }
    if (next.kind === 'location' && event.type === 'StorageLocationRenamed') { next.name = event.name; return next; }
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
