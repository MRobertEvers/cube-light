export const PROTOCOL_VERSION = 1;
export const CHECKPOINT_EVENTS = 100;
export const CHECKPOINT_AGE_MS = 24 * 60 * 60 * 1000;

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type AggregateKind = 'deck' | 'collection' | 'location' | 'profile' | 'work';
export type Crop = { x: number; y: number; zoom: number };
export type BannerCrop = { desktop: Crop; mobile: Crop };
export type Palette = { accent: string; surface: string; wash: string; border: string };
export type Profile = { cardName: string; cardUuid: string; art: string; crop: Crop };
export type BlendConfig = {
    version: number; method: 'multiband' | 'poisson' | 'fade'; contentAware: boolean;
    position: number; width: number; surface: string; protectSubject: boolean;
    feather: number; decontamination: number;
    protection: null | { source: string; rect: null | { x: number; y: number; width: number; height: number }; strokes: { label: 'foreground' | 'background'; radius: number; points: number[] }[] };
};
export type Blend = { config: BlendConfig; source: string; crop: BannerCrop; images: { desktop: string; mobile: string; tile: string } };
/** Which list of a deck a card belongs to. The main board is the deck itself; the side board holds swap-ins. */
export type DeckBoard = 'main' | 'side';
export const DECK_BOARDS: readonly DeckBoard[] = ['main', 'side'];
/** `board` defaults to the main board, so edits written before boards existed keep their meaning. */
export type CardEdit = { uuid: string; action: 'add' | 'remove' | 'set'; count: number; board?: DeckBoard };
/** Only side-board changes name their board, so main-board events keep the shape they always had. */
export type CardQuantityChange = { uuid: string; previous: number; delta: number; resulting: number; board?: 'side' };
/** A free-text note kept with a deck. */
export type DeckNote = { text: string; createdAt: string; updatedAt: string };
export type CommonState = { id: string; kind: AggregateKind; deleted: boolean; createdAt: string; updatedAt: string };
export type DeckState = CommonState & {
    /** Main-board quantities by printing UUID. */
    kind: 'deck'; name: string; cards: Record<string, number>; art: string | null;
    /** Side-board quantities by printing UUID. Absent while the side board is empty, so older states hash the same. */
    sideboard?: Record<string, number>;
    bannerCardUuid: string | null; palette: Palette | null; bannerCrop: BannerCrop | null;
    topStyle: 'card' | 'full-art'; bannerBlend: Blend | null;
    /** The client's id for how the deck's cards are drawn. Absent until one is chosen, so older states hash the same. */
    boardVisualization?: string;
    /** Notes by note ID. Absent while the deck has none, so older states hash the same. */
    notes?: Record<string, DeckNote>;
};
export type NamedState = CommonState & { kind: 'collection' | 'location'; name: string };
export type ProfileState = CommonState & { kind: 'profile'; userId: number; profile: Profile | null; printingView: 'compact' | 'grid' };
export type WorkState = CommonState & {
    kind: 'work'; deckId: string; fileName: string; contentType: string; blobId: string;
    pipeline: 'card-aware' | 'paddle-only'; status: 'pending' | 'running' | 'completed' | 'failed';
    completed: number; total: number; cardsAdded: number; error: string | null;
};
export type AggregateState = DeckState | NamedState | ProfileState | WorkState;

export type DomainCommand =
    | { type: 'deck.create'; id: string; name: string }
    | { type: 'deck.details'; id: string; name: string; bannerCardUuid?: string; art?: string }
    | { type: 'deck.cards'; id: string; edits: CardEdit[] }
    | { type: 'deck.palette'; id: string; palette: Palette | null }
    | { type: 'deck.crop'; id: string; crop: BannerCrop }
    | { type: 'deck.style'; id: string; topStyle: 'card' | 'full-art' }
    | { type: 'deck.visualization'; id: string; boardVisualization: string }
    | { type: 'deck.blend'; id: string; blend: Blend }
    | { type: 'deck.note'; id: string; noteId: string; text: string }
    | { type: 'deck.noteDelete'; id: string; noteId: string }
    | { type: 'deck.delete'; id: string }
    | { type: 'collection.create' | 'location.create'; id: string; name: string }
    | { type: 'collection.rename' | 'location.rename'; id: string; name: string }
    | { type: 'profile.artwork'; id: string; userId: number; profile: Profile }
    | { type: 'profile.printingView'; id: string; userId: number; printingView: 'compact' | 'grid' }
    | { type: 'work.queue'; id: string; deckId: string; fileName: string; contentType: string; blobId: string; pipeline: 'card-aware' | 'paddle-only' }
    | { type: 'work.start'; id: string; token: string }
    | { type: 'work.progress'; id: string; token: string; completed: number; total: number }
    | { type: 'work.complete'; id: string; token: string; edits: CardEdit[]; deckId: string; deckRevision: number }
    | { type: 'work.fail'; id: string; token: string; error: string }
    | { type: 'work.release'; id: string; token: string }
    | { type: 'work.retry' | 'work.delete'; id: string };

export type DomainEvent =
    | { type: 'DeckCreated'; name: string }
    | { type: 'DeckDetailsChanged'; name: string; bannerCardUuid?: string; art?: string }
    | { type: 'CardQuantitiesAdjusted'; changes: CardQuantityChange[] }
    | { type: 'DeckPaletteSelected'; palette: Palette | null }
    | { type: 'DeckCropSelected'; crop: BannerCrop }
    | { type: 'DeckStyleSelected'; topStyle: 'card' | 'full-art' }
    | { type: 'DeckVisualizationSelected'; boardVisualization: string }
    | { type: 'DeckBlendGenerated'; blend: Blend }
    | { type: 'DeckNoteSaved'; noteId: string; text: string }
    | { type: 'DeckNoteDeleted'; noteId: string }
    | { type: 'DeckDeleted' }
    | { type: 'CollectionCreated' | 'StorageLocationCreated'; name: string }
    | { type: 'CollectionRenamed' | 'StorageLocationRenamed'; name: string }
    | { type: 'ProfileArtworkSelected'; userId: number; profile: Profile }
    | { type: 'PrintingViewPreferenceSet'; userId: number; printingView: 'compact' | 'grid' }
    | { type: 'ScanQueued'; deckId: string; fileName: string; contentType: string; blobId: string; pipeline: 'card-aware' | 'paddle-only' }
    | { type: 'ScanStarted' | 'ScanReleased' | 'ScanRetried' | 'ScanDeleted' }
    | { type: 'ScanCompleted'; cardsAdded: number }
    | { type: 'ScanFailed'; error: string }
    | { type: 'DeckImportedFromLegacy'; state: DeckState }
    | { type: 'CollectionImportedFromLegacy'; state: NamedState }
    | { type: 'StorageLocationImportedFromLegacy'; state: NamedState }
    | { type: 'ProfileImportedFromLegacy'; state: ProfileState }
    | { type: 'WorkImportedFromLegacy'; state: WorkState };

export type EventEnvelope = {
    eventId: string; aggregateId: string; aggregateSequence: number; commitPosition: number;
    operationId: string; actorId: number; recordedAt: string; eventSchemaVersion: 1;
    previousEventHash: string; eventHash: string; event: DomainEvent;
};
export type Checkpoint = {
    aggregateId: string; throughSequence: number; throughEventId: string;
    schemaVersion: 1; reducerVersion: 1; stateHash: string; ledgerHash: string;
    createdAt: string; state: AggregateState;
};
export type Replica = { id: string; sequence: number; hash: string; state: AggregateState; checkpoint: Checkpoint; events: EventEnvelope[] };
export type CommandRequest = {
    protocolVersion: 1; serverInstanceId: string; accountId: number; datasetId: 'shared';
    operationId: string; clientId: string; expectedRevision: number; command: DomainCommand;
};
export type CommandOutcome = {
    operationId: string; status: 'accepted' | 'conflict' | 'rejected'; message?: string;
    events: EventEnvelope[]; replicas: Replica[]; revisions: Record<string, number>;
};
export type AccountScope = { partition: string; serverInstanceId: string; accountId: number; generation: number };
export type PublicUser = { id: number; username: string; profile: Profile | null };
export type Session = { user: PublicUser | null; setupRequired: boolean; serverInstanceId: string };
export type TokenPair = { tokenType: 'Bearer'; accessToken: string; refreshToken: string; accessExpiresAt: number; refreshExpiresAt: number; familyId: string; generation: number };
export type AuthSession = Session & { tokens?: TokenPair };
export type ResourceQuery =
    | { type: 'history'; id: string }
    | { type: 'card.details'; uuid: string }
    | { type: 'card.printings'; name: string }
    | { type: 'card.resolve'; name: string; setCode?: string }
    | { type: 'card.suggestions'; stub: string }
    | { type: 'card.names'; format: 'all' | 'wasm' | 'index' }
    | { type: 'blob'; id: string };
export type Query =
    | { type: 'decks' }
    | { type: 'deck'; id: string }
    | { type: 'history'; id: string }
    | { type: 'collections' | 'locations' | 'work' | 'profile' }
    | { type: 'resource'; resource: ResourceQuery };
export type SyncPage = {
    protocolVersion: 1; serverInstanceId: string; replicas: Replica[];
    outcomes: CommandOutcome[]; cursor: number; hasMore: boolean;
    catalog: Record<string, Json>; bootstrapComplete?: boolean;
};
export type StoredResource = { key: string; body: Blob; status: number; contentType: string; validatedAt: string };
export type LocalSnapshot<T = unknown> = {
    data: T | null; presence: 'missing' | 'partial' | 'complete'; localRevision: number;
    lastValidatedAt: string | null; pendingCount: number; conflictCount: number;
    refresh: 'idle' | 'queued' | 'running' | 'failed' | 'auth-required'; lastError: string | null;
};

export class DomainError extends Error {
    constructor(message: string) { super(message); this.name = 'DomainError'; }
}
