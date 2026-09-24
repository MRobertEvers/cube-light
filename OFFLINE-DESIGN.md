# Offline PWA and ToriMTG core

Architecture and implementation contract for `projects/clientv2`, the shared
`projects/torimtg-core` package, and the Express/SQLite server in `projects/server`.
The authentication contract below supersedes the original cookie-based proposal.

## 1. One data flow

Every application data change is committed locally before it can reach the server.
Being online changes how quickly synchronization happens, never the write path.
Redux is the UI's in-memory projection. IndexedDB is the durable local store. The
server's accepted event ledger is authoritative about shared domain state. Use
CQRS to separate commands from queries, and event sourcing plus periodic verified
checkpoints to reconstruct state without replaying the entire history each time.

```text
                       ToriMTG core
                 +---------------------------------------+
 UI <-> Redux    |                                       |
        + thunks <-> IndexedDB <-> Sync host  <-> Server
                 |                                       |
                 +---------------------------------------+

 Outbound: Redux -> IndexedDB -> Sync host -> Server
 Inbound:  Server -> Sync host -> IndexedDB -> Redux
 Local:    Redux -> IndexedDB -> Redux     (no network wait)
```

The local return is the first part of the same flow: Redux can display a committed
local edit immediately while the sync host delivers it to the server later.
All Redux domain values, including server responses, come from IndexedDB reads.
Thunks never receive a raw server response to put directly into Redux.

These are architectural invariants:

1. A domain command atomically appends its local intent/proposed events, updates
   the local projection, and inserts an outbox entry. All three commit together.
2. The UI reports an edit as saved only after the IndexedDB transaction completes.
   A reducer may show a saving indicator immediately, but cannot publish the new
   domain value before that commit.
3. Exactly one sync host performs application API requests, and it always runs
   the same `SyncCoordinator` against the same IndexedDB store. There is no
   online fast path: the UI never talks to the API directly. That host is
   `InThreadSyncHost`, which runs the coordinator on the page. A shell-only
   service worker (section 13) lets the app start offline where it can register;
   it never touches API traffic.
4. Server results, receipts, errors, and sync progress are persisted before the
   UI is notified. Notifications tell the UI to reread; they do not carry data.
5. Work survives closing a tab, reloading the page, and retrying a request.
6. Refreshing server state never silently overwrites pending local intent.
7. Domain state is reconstructible from a typed checkpoint and ordered events.
   Projections and query caches are rebuildable; they are never the history.

“All changes” includes decks, card quantities, imports, collections, storage
locations, profile artwork, saved preferences, and persisted work-item changes.
Focus, modal visibility, hover, and unsubmitted form text are ephemeral UI state
and can stay in Redux/component state. Saving a draft makes it a core command.

## 2. Starting point in this repository

The current code has multiple network paths that must converge:

| Current code | Required change |
| --- | --- |
| `src/store/decks/decks.state.ts` calls API/deck helpers from thunks | Inject ToriMTG into thunks; read committed local snapshots |
| `src/api/*` and `src/api/utils.ts` perform credentialed fetches | Move transport responsibility behind the worker entry point |
| `src/workers/deck.worker.ts` fetches and mutates decks | Keep CPU transformations in dedicated workers; route domain commands through Redux/ToriMTG |
| `src/service-worker/service-worker.ts` only registers `./service-worker.sw.js` | Build an actual root-scoped worker and wire registration into startup |
| `index.html` and `vite.config.mts` | Add manifest, worker build, and versioned offline shell assets |
| Server mutation routes allocate public IDs and return varied responses | Add client IDs, receipts, revisions, and a transactional sync protocol |
| `src/components/PrintingPicker/PrintingPicker.tsx` uses localStorage | Migrate saved preferences into IndexedDB once, through core commands |

The existing deck history and banner revision are useful domain features, but
neither is a general event ledger or aggregate revision system. Historical data
migration is described with the CQRS model below.

## 3. What the sync host does

`InThreadSyncHost` runs synchronization on the page: it reads durable work from
IndexedDB, sends it to the server, reconciles responses into IndexedDB, and
announces local commits. Elsewhere in this document "the worker" refers to this
host; the protocol, lease, and retry rules are the same wherever it runs.

Sync deliberately does not run in a service worker. An earlier design did, but
registration depends on a trusted secure context and failed in too many
environments (LAN origins, untrusted certificates, private browsing) to carry
the app's data path. The consequences are:

* Once loaded, every read and edit is local, and edits made offline sync when the
  network returns while the app is open.
* Nothing syncs while every tab is closed; queued work resumes at the next launch.
* Starting the app with no network depends only on the shell worker (section 13),
  an optional enhancement.

IndexedDB does not invoke the host automatically. After committing work, the
engine wakes it. The host reads the work itself. Missing a wake-up cannot lose the
command because the outbox is durable and is scanned at the next wake-up.

```text
 Window / Redux             IndexedDB             Sync host            Server
       |                        |                    |                 |
       |-- commit command ----->|                    |                 |
       |<-- committed snapshot -|                    |                 |
       | render local result    |                    |                 |
       |-- wake (hint only) ------------------------>|                 |
       |                        |<-- read outbox ----|                 |
       |                        |                    |-- send command ->|
       |                        |                    |<-- receipt -----|
       |                        |<-- commit result --|                 |
       |<-- local change notice (hint only) ---------|                 |
       |-- read snapshot ------>|                    |                 |
       |<-- committed snapshot -|                    |                 |
       | render sync result     |                    |                 |
```

This is an explicit queue processor, not a scheme that lets thunks fetch and then
intercepts failed requests. API responses are not stored in Cache Storage.

The host serialises its runs so overlapping wake-ups cannot start concurrent
passes, uses bounded batches and fetch timeouts, and persists all continuation
state, so a closed tab or reload loses nothing. When work remains after a pass it
retries on a short timer.

## 4. ToriMTG core boundary

ToriMTG is one framework-independent TypeScript core with two runtime entry points.
It imports neither React nor Redux. Both entry points share domain types,
IndexedDB schema, validation, and projection logic.
Put the pure aggregate definitions, event codecs, reducers, and protocol DTOs in
a shared `projects/torimtg-core` package consumed by client and server; it has no
browser or Express dependencies. The client-side folders below compose that
package with browser adapters rather than duplicating server business rules.

```text
 projects/clientv2/src/
   app/                        Composition root: builds adapters, worker clients, engine, store
   ui/pages|features|kit/      React; reaches data only through Redux selectors and thunks
   state/                      Redux slices, thunks (extra = ToriMTGEngine), event projections
   engine/                     The ToriMTGEngine: semantic API, core, local store, sync, jobs
     ports.ts                  Every interface the engine needs from outside itself
     api/                      Semantic namespaces: decks, cards, library, session, sync, ...
     core/  local-store/       Local reads/writes, projections, outbox transactions
     sync/sync-coordinator.ts  Queue runner and reconciliation (runs in a SyncHost)
   platform/                   Browser adapters implementing ports: IndexedDB, HTTP, crypto, ...
   workers/<name>/             One folder per worker thread:
     <name>.worker.ts          Worker entry (its thread's composition root)
     <name>.client.ts          Main-thread binding; implements an engine port
     <name>.protocol.ts        Message types shared by both sides
   domain/                     Pure models and rules; imports nothing else in src

 projects/server/src/sync/
   commands.ts                 Authorization and transactional command handling
   queries.ts                  Consistent snapshots and operation outcomes
   changes.ts                  Incremental replication and bootstrap
```

`test/layers.test.ts` enforces this layout: each layer may import only the layers
below it, and only a `*.client.ts` may start its worker. The names below define the
intended API contract, not finished implementation:

```ts
interface ToriMTG {
    commands: CommandApi;
    queries: QueryApi;
    open(): Promise<void>;
    subscribe(listener: (notice: LocalChangeNotice) => void): () => void;
    requestSync(): Promise<void>;
    close(): Promise<void>;
}

interface CommandApi {
    execute(command: DomainCommand): Promise<LocalCommit>;
    resolveConflict(resolution: ConflictResolution): Promise<LocalCommit>;
}

interface QueryApi {
    read<T>(query: Query<T>): Promise<LocalSnapshot<T>>;
    requestRefresh(query: Query<unknown>): Promise<RefreshTicket>;
}

interface LocalSnapshot<T> {
    scope: AccountScope;
    data: T | null;
    presence: 'missing' | 'partial' | 'complete';
    localRevision: number;
    lastValidatedAt: string | null;
    stale: boolean;
    refresh: 'idle' | 'queued' | 'running' | 'failed' | 'auth-required';
    pendingCount: number;
    conflictCount: number;
    lastError: CoreError | null;
}

interface LocalCommit {
    operationId: string;
    localRevision: number;
    affectedQueryKeys: string[];
    durability: 'local';
}
```

`commands.execute` resolves at local transaction completion, not server acceptance.
`queries.requestRefresh` persists a deduplicated refresh job and wakes the worker; its promise
does not block on the network. `requestSync` also records a durable sync request
before waking the worker. `read` is always local and never fetches implicitly.
`open` opens local storage first; worker installation cannot block local hydration.
CQRS separates domain mutation from retrieval, not the transport into two paths:
query refreshes use the same durable worker pipeline. `read` has no side effects;
`requestRefresh` changes only synchronization control state.

The app creates one core instance for the active account partition and supplies it
as Redux thunk `extraArgument`. A store-level subscription bridge dispatches
thunks that reread affected queries. Routes manage which queries are observed;
component unmounting removes observations, never cancels durable mutations.

Conceptual thunks:

```ts
export const loadDeck = createAsyncThunk(
    'decks/loadLocalAndRefresh',
    async function (deckId: string, api: AppThunkApi) {
        const { tori } = api.extra;
        const query = deckQuery(deckId);
        const snapshot = await tori.queries.read(query);
        api.dispatch(deckSnapshotReceived({ deckId, snapshot }));
        await tori.queries.requestRefresh(query);
    }
);

export const renameDeck = createAsyncThunk(
    'decks/rename',
    async function (input: RenameDeckInput, api: AppThunkApi) {
        const { tori } = api.extra;
        await tori.commands.execute({ type: 'deck.rename', ...input });
        const snapshot = await tori.queries.read(deckQuery(input.deckId));
        api.dispatch(deckSnapshotReceived({ deckId: input.deckId, snapshot }));
    }
);
```

There is one Redux ingestion action per query family: receive a local snapshot.
Reducers ignore older `localRevision` values and mismatched account generations.
They do not interpret server receipts or implement conflict handling. A later
local read may already include subsequent edits; that is valid.

Enforce the boundary with import rules: components, thunks, and computation
workers cannot import the application API transport or access domain IndexedDB
stores directly. Core window modules cannot import worker transport. Static
asset loading is managed separately by the PWA shell.

### Infrastructure abstractions: no raw calls in application logic

ToriMTG depends on three typed interfaces. Browser details are confined to their
adapters; neither thunks nor core orchestration call `indexedDB.open`,
`postMessage`, `navigator.serviceWorker`, or `fetch` directly.

```text
 Redux thunks
      |
      v
 ToriMTG window facade
      |
      +--> LocalStore ------------> IndexedDbLocalStore
      |                               |
      |                         commit domain intent
      |                               |
      +--> SyncHost                   |
             |                        |
       InThreadSyncHost               |
             | wake-up only           |
             v                        v
       Sync coordinator -------> LocalStore (same IndexedDB)
             |
             +--> SyncTransport -> HttpSyncTransport -> Server
             |
             +--> LocalStore.reconcile(...)         (commit response)
             |
             +--> SyncHost.announce(...)            (invalidation only)
```

The diagram shows code dependencies. Domain data still follows
`Redux -> IndexedDB -> Sync host -> Server` and the reverse path. The bridge
only wakes the host after durable work exists; it cannot send domain payloads
as a shortcut around IndexedDB.

**`LocalStore` abstracts IndexedDB with domain-aware atomic operations.** It
returns plain typed values, never `IDBRequest`, object-store handles, or browser
transactions. Its adapter owns opening connections, indexes, schema upgrades,
transaction completion/abort handling, and serialization.

```ts
interface LocalStore {
    open(): Promise<void>;
    read<T>(scope: AccountScope, query: Query<T>): Promise<LocalSnapshot<T>>;
    commitIntent(scope: AccountScope, command: DomainCommand): Promise<LocalCommit>;
    enqueueRefresh(scope: AccountScope, query: Query<unknown>): Promise<RefreshTicket>;
    requestSync(scope: AccountScope): Promise<void>;
    acquireLease(scope: AccountScope, owner: string): Promise<Lease | null>;
    renewLease(lease: Lease): Promise<Lease | null>;
    claimNext(lease: Lease): Promise<PreparedWork | null>;
    reconcile(lease: Lease, result: SyncResult): Promise<LocalChangeNotice>;
    recordFailure(lease: Lease, failure: SyncFailure): Promise<LocalChangeNotice>;
    releaseLease(lease: Lease): Promise<void>;
    close(): Promise<void>;
}
```

These signatures illustrate the principal operations; bootstrap staging,
conflict resolution, blobs, and account control have corresponding typed methods.
Expose narrow facets to consumers: `LocalQueryStore` for local reads,
`LocalCommandStore` for intent commits, and `LocalReplicaStore` for worker
reconciliation/leases. They share one IndexedDB implementation and transaction
manager. A projector cannot enqueue a command, and a query reader cannot append
an event merely because they share that database.
`commitIntent` encapsulates the entire journal-plus-outbox-plus-projection transaction.
`claimNext` atomically claims work and freezes its request. `reconcile` performs
the whole inbound transaction and verifies the lease fence/account generation.
Repositories beneath this interface share the adapter's unit of work: composing
separate `saveView` and `saveOutbox` promises would not satisfy atomicity.

**`SyncHost` runs sync** (`InThreadSyncHost`, on the page). It serialises runs,
authenticates, and relays committed-change notices. Its promises describe wake-up
delivery, not remote save completion. Queued mutations remain successful local
saves if a wake-up fails.

```ts
interface SyncHost {
    connect(): Promise<void>;
    wake(): Promise<void>;
    authenticate(id: string, credentials?: { username: string; password: string }): Promise<void>;
    subscribe(listener: (notice: LocalNotice) => void): () => void;
}
```

**`SyncTransport` abstracts the network API.** It is injected only into the worker
coordinator. Calls take typed, durably prepared work and return validated domain
results rather than HTTP `Response` objects.

```ts
interface SyncTransport {
    sendCommand(command: PreparedCommand): Promise<CommandOutcome>;
    query(request: PreparedQuery): Promise<QueryOutcome>;
    pullChanges(request: PreparedPull): Promise<ChangePage>;
    bootstrap(request: PreparedBootstrap): Promise<BootstrapPage>;
    uploadChunk(request: PreparedUploadChunk): Promise<UploadReceipt>;
}
```

`HttpSyncTransport` owns endpoint selection, request/response codecs, credentialed
transport, abort timeouts, protocol checks, and mapping HTTP failures into typed
errors. A private `HttpTransport` adapter contains the raw `fetch` call. It never
updates Redux or local storage. It also never independently retries mutations:
the coordinator persists retry decisions through `LocalStore`, preserving the
same operation ID and frozen body. The authentication control API uses the same
transport adapter with transient credentials, as described in section 12.

Construct the window facade with `{ localStore, syncHost }`, and the sync host
with `{ localStore, syncTransport, crypto }`.
Only composition roots select browser adapters. Tests inject deterministic
implementations of these interfaces; adapter contract tests separately verify
actual IndexedDB atomicity, browser messaging, and HTTP serialization. This keeps
test doubles from concealing a violation of the durable single-flow contract.

## 5. CQRS, event ledgers, and balancing

Use **CQRS with event sourcing** for mutable application data. Commands express
intent, accepted events record facts, and projections answer queries. A checkpoint
is a verified opening balance for a particular aggregate at a particular event
sequence. It is not an arbitrary dump of the current application state. This
combination of events, materialized reads, and replay checkpoints follows the
[event sourcing pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing);
the concrete boundaries and policies below are choices for ToriMTG.

```text
 WRITE SIDE                             READ SIDE

 Command                                Query
    |                                      |
    v                                      v
 Aggregate handler                     Typed read model ----> Redux
    | validate + decide                    ^
    v                                      |
 Append-only events -----------------> Projector
    |                                      ^
    +--> Checkpoint + event suffix ---------+
         verified opening balance

 Local proposed events --> pending overlay --> local read model
 Server accepted events -> confirmed base ---> local read model
```

### Commands, events, and ownership

Split the domain by consistency boundary. Each aggregate owns its invariants,
command union, event union, reducer, and checkpoint schema. Do not introduce
`StateChanged { key, value }`, arbitrary JSON patches, or a global app-state event.

| Aggregate | Example commands | Example accepted facts | Checkpoint state |
| --- | --- | --- | --- |
| Deck, including its card quantities | `CreateDeck`, `RenameDeck`, `AdjustCardQuantity`, `SetCardQuantity`, `ImportDeckCards`, `DeleteDeck` | `DeckCreated`, `DeckRenamed`, `CardQuantityAdjusted`, `DeckCardsImported`, `DeckDeleted` | Identity, metadata, appearance settings, card UUID-to-quantity map, deletion status |
| Collection | `CreateCollection`, `RenameCollection` | `CollectionCreated`, `CollectionRenamed` | Identity, name, defined membership fields |
| Storage location | `CreateStorageLocation`, `RenameStorageLocation` | `StorageLocationCreated`, `StorageLocationRenamed` | Identity, name, defined location fields |
| User profile/preferences | `SetProfileArtwork`, `SetPrintingView` | `ProfileArtworkSelected`, `PrintingViewPreferenceSet` | Explicit artwork/crop fields and named preferences |
| Work item | `QueueScan`, `CompleteScan`, `CancelScan` | `ScanQueued`, `ScanCompleted`, `ScanCancelled` | Input blob references, status, result references |

The examples describe the target vocabulary, including commands to add as those
features are implemented. Mutable catalog copies, query freshness, retries,
leases, focus, and rendering progress are not domain events. Operational work
claims/heartbeats belong to their control store; retain only meaningful work-item
transitions in its domain stream. Images/models belong in blob/asset storage,
referenced by ID/hash rather than embedded in every event.

Use shared pure functions `decide(state, command, context)` and
`apply(state, event)`. `decide` returns a typed event batch or domain error; the
server also performs authorization and revision checks. `apply` folds historical
facts without rerunning today's command validation, reading the clock, generating
IDs, fetching catalog values, or accessing storage. Resolve names to stable card
UUIDs and include all replay-relevant values before accepting an event.
Time/randomness enter via explicit context and are recorded if they affect state.

An absolute `SetCardQuantity(5)` may produce
`CardQuantityAdjusted { cardUuid, previous: 3, delta: 2, resulting: 5 }` after
validation at the expected revision. Keeping intent separate from fact avoids
reinterpreting “set to 5” as “add 2” after a conflict. An import emits one bounded
batch with normalized card changes. The batch and its projection commit together;
checkpoints never split a command's event batch. Apply explicit limits to import
size; larger jobs expose deliberate batch progress rather than pretending to be
one unbounded transaction.

Typed envelopes use discriminated event unions, not an unrestricted payload map:

```ts
interface EventEnvelope<E extends DomainEvent> {
    eventId: string;
    datasetId: string;
    aggregate: AggregateKey;
    aggregateSequence: number;
    commitPosition: number;
    batchId: string;
    batchIndex: number;
    batchSize: number;
    operationId: string;
    actorId: string;
    recordedAt: string;
    eventSchemaVersion: number;
    previousEventHash: string;
    eventHash: string;
    event: E;
}

interface DeckCheckpoint {
    aggregate: DeckKey;
    throughSequence: number;
    throughEventId: string;
    checkpointSchemaVersion: number;
    reducerVersion: number;
    stateHash: string;
    ledgerHash: string;
    state: DeckStateV1;
}

interface DeckStateV1 {
    deckId: string;
    name: string;
    status: 'active' | 'deleted';
    cards: Record<string, number>; // Card UUID -> positive integer quantity
    appearance: DeckAppearanceV1;
}

interface DeckAppearanceV1 {
    bannerCardUuid: string | null;
    topStyle: 'card' | 'full-art';
    crop: { x: number; y: number; zoom: number } | null;
    palette: string[] | null;
    blendRecipeId: string | null;
}
```

The appearance schema is the proposed normalized domain shape; adapt existing
API fields at migration boundaries. Blend recipes are separately typed immutable
values referenced by ID. Each aggregate's checkpoint owns its necessary replay
state without embedding another aggregate or an entire API response. Quantities
cannot be negative; zero removes a card entry. Deletion leaves an explicit
tombstone. Canonical hashing sorts map keys and fixes number/string encoding;
it does not depend on JavaScript object insertion order. `eventHash` covers the
canonical envelope except itself, including the preceding per-aggregate hash.

Read models are also purpose-specific: `DeckDetailView`, `DeckListRow`,
`DeckHistoryEntry`, and `PendingSyncSummary` have separate projector versions and
watermarks. Sorting and joined catalog descriptions belong to these models, not
the deck checkpoint. A new screen adds a query/projection instead of adding UI
fields to historical events.

`aggregateSequence` is a contiguous revision within one aggregate. `commitPosition`
orders committed batches within the dataset for replication. Neither is a device
timestamp, local journal sequence, or Redux `localRevision`. Event IDs deduplicate
delivery; operation IDs deduplicate commands; one command may yield several events.
The server assigns canonical event identity/order. Proposed events have separate
local IDs and never claim server sequence numbers.

### Two ledgers with distinct authority

The **server event ledger** contains accepted domain facts only. Its events are
immutable, including corrections: undo produces compensating events. A rejected
command creates a receipt, not a fake domain event. Deck history is a projection
of this ledger, not another independently maintained history log.

The **local intent journal** is append-only evidence of the device's work. It
records `IntentRecorded` (command, base/dependencies, proposed event batch),
`RequestPrepared`, `IntentAccepted`, `IntentRejected`, and `ResolutionRecorded`.
Delivery attempts/backoff are mutable operational metadata, not additional domain
events. Outbox and pending views can be rebuilt from this journal. An acceptance
record points to the canonical event IDs and receipt; it does not mutate a
proposed event into an accepted one.

The proposed event batch reconstructs what the user originally saw. After the
confirmed base changes, re-run eligible pending commands against that base for
their preview, preserving dependencies and marking conflicts. Do not blindly
apply stale `previous`/`resulting` values from the original proposal. Any persisted
replacement preview records its new base version; original intent stays intact.

```text
 confirmed state = fold(verified checkpoint, contiguous accepted event suffix)
 pending intents = fold(local intent journal, durable acceptance/resolution facts)
 visible state   = preview(confirmed state, pending intents in dependency order)
```

The normal read path uses materialized projections. Reconstruction is for startup
recovery, projection upgrades, verification, and history; it is not required on
every React render. In version 1 update small read projections in the same local
or server transaction as the associated event append. This gives read-your-write
behavior without a separate asynchronous message broker.

### What “balanced” means

A balanced checkpoint covers **only a verified prefix of accepted server events**.
Pending local commands stay visible as outstanding entries beside that balance.
Balancing does not require an empty outbox and never acknowledges or drops pending
work. A local-only recovery cache must be labeled speculative and can never be
uploaded or installed as a confirmed checkpoint.

```text
 Deck A / one card

 Verified checkpoint through event 120                quantity 4
 Event 121: CardQuantityAdjusted, delta +2                    +2
 Event 122: CardQuantityAdjusted, delta -1                    -1
                                                     ----------
 Confirmed closing balance through event 122                  5
 Pending local intent: add 1                                 +1
                                                     ----------
 UI working balance                                          6

 New checkpoint at 122 stores 5. The pending +1 remains outstanding.
```

Checkpoint **per aggregate**, after a completed batch, when either 100 accepted
events have accumulated since its previous checkpoint, or the aggregate is dirty
and its previous checkpoint is at least 24 hours old. Evaluate the age condition
on the next successful synchronization/maintenance opportunity; it is not a
promise that a suspended browser runs a daily job. Create initial checkpoints
during bootstrap/migration. Server maintenance uses the same policy; measure
replay cost before changing these defaults. Normal reads continue using the
current projection even when checkpoint work is deferred.

The checkpoint builder:

1. Captures a stable target sequence at a complete command-batch boundary.
2. Loads the preceding verified checkpoint and the contiguous event suffix.
3. Checks sequence continuity, batch completeness, supported schemas, domain
   invariants, and the server-provided chained ledger hash.
4. Independently folds those events and compares the canonical state hash with
   the projection/server balance at exactly that sequence, never with a newer
   head. Hashes exclude cache timestamps, sort artifacts, and sync status.
5. Publishes a new typed checkpoint and coverage metadata atomically. A concurrent
   edit is either outside the captured prefix or remains in the pending overlay.

Hashes detect corruption/drift, not authorization or proof that the server is
honest. A first downloaded checkpoint is a trusted server anchor over the
authenticated transport; replay can verify its suffix, not independently prove
history the device never downloaded. On mismatch/gap, retain the prior checkpoint,
pause the affected aggregate, request repair through the persisted worker path,
and retain pending intent. Never invent an adjustment event merely to make totals
match. A real user correction is an explicit command with a reason.

`DeckStateV1` contains only the deck's domain state, including deletion status and
references needed for replay. Deck-list rows, search indexes, history pagination,
images, account sessions, and queue state are separate models. A checkpoint has
its own schema version, reducer version, event coverage, and deterministic hash.
Rebuild read models into a new generation and atomically switch when complete;
the projector's watermark prevents applying an event twice.

### Retention, schema evolution, and existing data

Keep the complete accepted server ledger in version 1. Checkpoints accelerate
reconstruction; they do not replace its history. Database backups must include
events, receipts, checkpoint metadata, and referenced durable blobs. Start without
a broker or external event-store service: SQLite transactions provide the needed
append/receipt/projection atomicity.

Locally retain the newest two verified checkpoints and the event suffix required
to replay from the older one. Older accepted events can be evicted only after
checkpoint coverage is verified and server retrieval remains available. Retain
all unresolved local journal entries, prepared requests, conflicts, and needed
receipts. Resolved intent groups may be removed together after checkpoint coverage
and after no pending operation depends on them; keep a bounded recent local audit
window of 30 days. Never delete an intent but leave its unresolved dependent behind.
Older history is fetched through core query jobs; label unavailable history offline.

Event schemas are versioned per event type. Pure upcasters interpret older events
without editing their stored bytes. Checkpoints and projections have independent
versions; a reducer change invalidates/rebuilds derived data. Unsupported event
versions stop that aggregate's projection and cursor advancement before the
unsupported batch; never skip an unknown event. Historical replay cannot trigger
network calls, send notifications to third parties, or execute work again.

For existing SQLite data, capture a consistent cutover and append one explicitly
typed `DeckImportedFromLegacy` (and corresponding domain-specific events) per
aggregate with provenance. This establishes an honest opening balance. Preserve
old deck-history records as legacy history; do not claim they form a complete
replayable ledger. After cutover, legacy endpoints and jobs must invoke the new
command handlers; direct table writes would bypass the source of truth.

## 6. Interface boundaries between systems

The contracts below define ownership and guarantees. Internal typed ports are
implemented by adapters; only adapters access browser, network, or SQL primitives.

| Boundary | Input -> output | Owner and guarantee |
| --- | --- | --- |
| UI -> Redux | User interaction -> typed thunk dispatch; selectors -> display | UI owns presentation and unsaved drafts; Redux owns transient presentation state |
| Redux thunk -> `CommandApi` | Domain command -> `LocalCommit` or typed local error | Core acknowledges only after journal, outbox, and projection commit |
| Redux thunk -> `QueryApi` | Query descriptor -> `LocalSnapshot`; refresh request -> durable ticket | Local read has no network effect; tickets mean scheduled, not remotely completed |
| Core -> aggregate domain module | State + command + explicit context -> proposed events/errors; state + event -> state | Pure deterministic rules own domain invariants; no I/O or Redux types |
| Core -> `LocalStore` | Typed atomic operation -> committed plain values | IndexedDB adapter owns transactions, indexes, migration, and account fences |
| Local commit -> store subscription | Partition/generation, local revision, affected query keys -> reread thunk | Notice is an at-least-once/best-effort hint; revisions and recovery reads ensure correctness |
| Window core -> `SyncHost` | Protocol handshake, wake, update request -> capability/delivery result | Bridge owns browser registration/messaging; no domain response shortcut |
| Browser lifecycle -> `WorkerHost` -> sync coordinator | Validated typed trigger -> bounded work promise | Host owns lifecycle extension; coordinator owns scheduling and durable continuation |
| Worker coordinator -> `SyncTransport` | Prepared command/query/pull/upload -> typed outcome/error | Network adapter owns transport/codecs/timeouts; coordinator owns retries and local reconciliation |
| Server HTTP boundary -> command/query services | Authenticated versioned DTO -> receipt/query/event page | Server checks identity, dataset authorization, versions, size limits, and input schema |
| Server command service -> aggregate/event repository | Expected revision + command -> accepted event batch + receipt | One server transaction owns append, revision, receipt, and immediate projections |
| Event repository -> projectors/checkpoint builder | Ordered immutable events + coverage -> read models/typed checkpoints | Pure replay with versioned reducers; atomic watermark/checkpoint publication |
| Server query service -> read repository | Typed descriptor + validator -> consistent read DTO | Query responses never mutate domain state; membership and coverage have explicit versions |
| Server -> worker -> local replica | Receipt, event batches, checkpoints, query membership -> committed local revision | Validate schemas/order/identity; fold only contiguous suffixes or verified checkpoint anchors |
| Worker core -> blob/upload adapter | Saved Blob reference/hash -> durable chunk/upload receipt | Blob is saved before network; domain events reference finalized content identities |
| PWA fetch host -> asset cache | Asset/navigation request -> resource bytes or offline fallback | Separate shell caching policy; cannot process domain writes or cache private API responses |
| Core auth control -> worker auth client | Durable auth intent + transient password -> stored identity and private token pair | Worker sends bearer headers and rotates tokens; Redux receives only non-secret identity/status |
| Computation worker -> UI thunk | Recognized cards/calculated proposal -> ordinary command | CPU workers cannot save domain data or contact domain endpoints independently |

The server persistence abstraction is also typed: `EventRepository.commitCommand`
owns expected-sequence append, deduplication, and transactional projection;
`ReadRepository.query` owns consistent read snapshots; `CheckpointRepository`
owns publication/coverage. `SqliteUnitOfWork` is internal to those adapters. Do
not expose a generic `executeSql` method to command handlers or share an untyped
event bus across domains.

Wire messages carry `protocolVersion`, `serverInstanceId`, `datasetId`, account
identity, correlation ID, and schema-specific DTOs. Window/worker messages also
carry account generation; durable operation IDs are distinct from transient
message IDs. Validate at both ends, and reject messages from unrecognized clients
or scopes. No browser handles, functions, Redux actions, cookies, or passwords
appear in persisted domain DTOs.

Events and receipts flow **server -> worker -> IndexedDB**. After that commit,
only an invalidation notice crosses into the window; a thunk reads a local
projection into Redux. Both the write side and query refreshes use this same
physical pipeline despite their different CQRS responsibilities.

## 7. IndexedDB model and transactions

Use an origin-local database, with every private key prefixed by
`partition = serverInstanceId + accountId + datasetId`. The dataset component
allows the existing shared collection model without assuming server data is
already owned per user. A small control store holds the active partition and
account generation. Public, immutable catalog data may be shared by catalog version.

| Store | Contents |
| --- | --- |
| `serverEvents` | Immutable accepted event envelopes; unique by event ID and aggregate sequence |
| `checkpoints` | Typed verified aggregate balances with event coverage, hashes, and schema versions |
| `localJournal` | Append-only intent, proposed event batches, preparation, acceptance, and resolution records |
| `receipts` | Canonical operation outcomes/event IDs needed for deduplication, dependencies, and reconciliation |
| `base` | Rebuildable confirmed aggregate projection, last folded sequence, and deletion tombstone |
| `views` | Rebuildable local aggregate projection: confirmed base plus replayable pending intent |
| `outbox` | Journal-derived delivery queue, dependencies, frozen requests, and operational retry state |
| `queries` | Canonical query key, ordered membership, completeness, snapshot watermark, validation time, refresh generation/error |
| `refreshJobs` | Deduplicated query requests and requested/completed generations |
| `conflicts` | Original intent, original base, current server state, and resolution status |
| `blobs` | Locally saved upload data and content hashes; commands reference these IDs |
| `meta` | Schema/protocol versions, client ID, local sequence, replica cursor, sync state, lease/fence |

Use the aggregate boundaries in section 5. Event-ledger keys are scoped by
partition/aggregate/sequence; the local journal uses a transactional device-local
sequence. Index outbox work by partition/status/deadline and aggregate/order.
Keep separate schemas and repositories for events, checkpoints, projections, and
operational queues. They can share a transaction without becoming one generic
key-value object. Index catalog/search data separately from mutable aggregates.

Each outbox entry includes:

```text
 operationId, partition, clientId, clientSequence, commandVersion
 aggregateKey, commandType, payload, createdAt
 originalBaseRevision, originalBaseValues, dependsOnOperationIds
 status, attempts, nextAttemptAt, lastError
 preparedRequest (frozen before first send), requestHash
 leaseOwner, leaseFence, leaseExpiresAt
```

Generate operation IDs with cryptographic randomness. Generate new domain IDs
locally using the existing `<kind>_<16 URL-safe characters>` public-ID format.
The server accepts and validates these IDs and rejects collisions; it must not
allocate a different identity for an offline-created entity. Internal SQLite row
IDs remain server-only. A create followed by edits uses dependencies on the create.

**Local command transaction:** validate against the current local view, allocate
the next journal sequence, append the intent with its proposed event batch,
insert the outbox row, update affected views/query membership, invalidate query
freshness, and increment `localRevision`. Publish a
change notice and wake the worker only after transaction completion. On an abort
or quota error, publish no domain change and return a local-save error.

**Inbound transaction:** insert/deduplicate canonical events or install a valid
checkpoint anchor; persist receipts and journal acceptance/resolution facts;
fold complete contiguous event batches into the confirmed base; remove accepted
intent from the overlay and reproject the remainder. Update query memberships,
conflicts, refresh state, projection watermarks, and the replica cursor as
applicable, then increment `localRevision`. Publish only after commit. An event
gap can be stored for repair but cannot advance the affected projection or cursor.

Network requests happen outside IndexedDB transactions: claim and prepare work in
one short transaction, fetch, then reconcile in another. IndexedDB transactions
are scoped and have a finite active lifetime; see
[MDN: using IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB).

## 8. Local-first writes and reconciliation

```text
                    local commit
 Command ------------------------------> queued
                                            |
                                    claim + freeze request
                                            v
                                         sending
                                      /     |     \
                              retryable     |      conflict/rejection
                                 |          |               |
                          retry-wait    acknowledged     blocked/failed
                                 |          |               |
                                 +-> queued |        user resolution
                                            v               |
                                 remove pending overlay     +-> new command
                                 retain durable receipt
```

Transport is at least once. Server-side idempotency makes the domain effect occur
once. An acknowledgement is not complete until it is committed locally.

The worker serializes commands per aggregate in local sequence order. Commands
against unrelated aggregates can proceed when another aggregate is blocked.
Version 1 uses one active runner per partition with bounded sequential requests;
parallel delivery is an optional later optimization.

For a command without local predecessors, preserve the revision seen when the
intent was created. For a command based on earlier local commands, preserve that
dependency and prepare its expected revision from its predecessor's accepted
receipt. Never silently substitute a newly fetched revision for an old intent.
Append a `RequestPrepared` journal entry and persist the complete prepared request
before sending. Retries use the same operation ID and exactly the same request
body. Lease/retry changes do not rewrite the recorded intent or domain events.

The local view is computed with shared, deterministic domain logic:

```text
 confirmed base = fold(checkpoint, contiguous accepted events after checkpoint)
 local view     = preview(confirmed base, unresolved replayable local commands)
```

For example: base count 2, pending `add 1`, visible count 3. If the server accepts
the operation and returns its canonical event producing count 3, the inbound
transaction folds that event and removes its pending proposal together. The UI
must never display 4.
If another pending `add 1` exists, the visible count becomes 4 in that transaction.

A server response cannot be merged while its own accepted local operations remain
in the overlay. Query and change-feed results therefore carry operation outcomes
for potentially delivered local IDs, consistent with the returned snapshot. This
also handles a lost acknowledgement followed by a successful refresh.

After worker death, an expired `sending` lease is reclaimable. Retry the immutable
request to discover the receipt before progressing dependent commands. Persist
server receipts even if the originating page has disappeared.

## 9. SWR reads from IndexedDB

Here SWR means **read local immediately, then request server validation**. It is
implemented by ToriMTG and Redux thunks, independently of an HTTP cache or a React
SWR library.

```text
 UI opens a deck
       |
       v
 Redux thunk --> queries.read --> IndexedDB --> Redux renders local snapshot
       |
       +------> queries.requestRefresh --> IndexedDB refresh job
                                           |
                                      wake worker
                                           |
                                      Server query
                                           |
                                      Service Worker
                                           |
                                IndexedDB reconciliation
                                           |
                                  local-change notice
                                           |
                                 Redux thunk rereads
                                           |
                                  UI renders new view
```

The worker uses the same runner for mutation delivery, refresh jobs, and replica
pulls. Resolve uncertain sends first, give queued writes bounded priority, and
then service refreshes so continuous editing cannot starve reads. A blocked
aggregate does not prevent fetching its latest server base for conflict display.

| Local state | UI behavior |
| --- | --- |
| Complete data, refresh queued/running | Render immediately; show a subtle refreshing indicator |
| Missing data, refresh running | Show an initial loading state |
| Missing data, offline | Show “Not available on this device yet”; do not show an empty collection |
| Partial local results | Render known results with an explicit incomplete-data indication |
| Refresh failed with cached data | Keep data visible; show retry/last successful validation |
| Pending mutations | Render local projection and “Saved on this device; waiting to sync” |
| Confirmed base with no pending mutations | Show synced status and last validation time |
| Conflict or permanent rejection | Keep the attempted edit accessible and expose resolution |

`lastValidatedAt` describes the server base, not proof that the local overlay is
accepted. A timestamp alone never resolves a conflict. “Synced” means no pending
or blocked operations for that scope, and records when server validation occurred;
it is not a claim that other devices can no longer change the data.

Query keys include partition, filters, sort, and pagination parameters. Repeated
refreshes coalesce. Each refresh has a generation: a result completes only the
generation it served, so an invalidation during a fetch schedules another pass.
Use local revisions and server revisions/watermarks to reject stale completions.

Queries project pending creates, edits, and deletes over confirmed membership.
For fully replicated lists, compute sorting/filtering locally. Server-paginated
or partially replicated queries retain completeness metadata; unknown results
must not be presented as a complete search. Disappearing from a page is not a
deletion: only explicit tombstones delete entities. Refreshing an empty complete
query is distinct from never having loaded it.

Subscriptions are invalidation hints. Install the subscription before the initial
read, coalesce rereads, and check the committed revision after reads to close
races. Notify other tabs using BroadcastChannel or worker client messages, and
notify the writing tab directly. On startup, focus, and visibility restoration,
compare local revisions and reread to recover missed notifications.

## 10. Server synchronization contract

Add a versioned protocol instead of replaying arbitrary legacy HTTP requests.
The routes below are proposed endpoints.

### Commands: `POST /sync/v1/commands`

Send one command envelope with protocol version, partition identity, operation ID,
client ID/sequence, aggregate key, expected revision, and typed payload. Put
idempotency metadata in the JSON body to fit the current credentialed CORS setup.

The server authenticates the actual session and verifies the requested account
and dataset. Client-provided partition IDs never grant access. In one server
transaction it:

1. Looks up `(account, dataset, operationId)` in the receipt ledger. A repeated ID
   with the same request hash returns its prior outcome; a different hash fails.
2. Checks permissions, command schema, aggregate revision, and domain constraints.
3. Loads the aggregate at the expected sequence, decides its typed canonical
   event batch, and appends that batch exactly once.
4. Advances the aggregate sequence and dataset commit position; folds the events
   into domain/read projections, including history and deletion tombstones.
5. Saves the operation receipt with event IDs, sequence range, and request hash.
6. Commits, then returns the durable receipt and canonical events, with a
   checkpoint anchor/event suffix if the client needs to catch up.

Receipt lookup precedes revision checking, so retrying a successful command does
not create a false conflict. A valid no-op can return a successful receipt with
no event batch and an unchanged revision. Receipt retention must cover indefinite offline
retry: retain a compact deduplication record permanently in version 1. Old receipt
snapshots never downgrade a newer local base, but still settle their operations.

The dataset change feed is an index over committed event batches, not another
editable history. Atomic uniqueness on aggregate/sequence and operation identity
protects concurrent command handlers. Multi-aggregate work uses an explicitly
declared atomic transaction when necessary (for example completing a scan and
adding its cards); normal commands own one aggregate. Cross-aggregate events share
a commit/batch identity and replicate atomically, with size limits.

Shared transactional persistence is required for receipt and domain event append.
Profile data currently uses a different persistence abstraction; its sync adapter
must provide the same atomicity (for example by moving synchronized profile data
into the application database). Do not perform a domain write and then save its
receipt in an unrelated store.

### Queries: `POST /sync/v1/query`

Accept a typed query descriptor, known revision/validator, and any local operation
IDs whose delivery outcome is uncertain. Return a typed read DTO, membership,
complete/partial coverage, projection version/watermark, a validator, and operation
outcomes from a consistent server read. For changed mutable aggregates, include
the accepted event suffix or a versioned checkpoint anchor plus suffix sufficient
to reproduce the returned revision. Never replace the base with unexplained JSON.
A “not modified” result updates validation
metadata locally and still settles any supplied operation outcomes.

These responses describe one snapshot. They must not combine an old entity value
with a receipt claiming a newer operation is already included. The client accepts
only nondecreasing entity revisions and query watermarks. A query watermark is
not a replica cursor and must not advance replication past unseen changes.

### Replication: `POST /sync/v1/changes` and `/sync/v1/bootstrap`

Use an opaque cursor over ordered committed event batches, never wall-clock
`updatedAt` comparisons. Each bounded page includes complete accepted batches
(including deletion events), relevant operation outcomes, and its next cursor.
Apply events and cursor in the same IndexedDB transaction. Never split an atomic
batch across an applied page. Server jobs and legacy mutation routes must invoke
the same event-producing command handlers.

On first download or expired cursor, obtain typed per-aggregate checkpoint anchors
and their event suffixes through a fixed dataset high-water mark. Include deletion
coverage and query membership metadata. Stage pages without replacing the current usable replica, then
atomically publish the completed generation and its cursor. Pull subsequent
changes from that mark. Preserve outbox/conflicts and rebuild their overlays;
never clear unsynced work to recover from a cursor reset. Snapshot publication
must also reject revisions older than locally accepted receipts. Retaining a
newer aggregate does not permit skipping unseen events for other aggregates.
An expired feed cursor does not imply that the canonical event ledger was deleted.

Replicate the user's mutable dataset for offline use, with explicit download
progress. Fetch large immutable card catalogs, images, and OCR packs separately
by version/selection. Querying a single deck can complete before full bootstrap.

## 11. Conflicts and failures

Start with optimistic concurrency at the aggregate level. The server returns a
conflict when an expected revision is stale. Do not implement automatic
last-write-wins based on device clocks. This can conflict on independent fields
of a deck; correctness is the initial tradeoff, with field-level merging a later
extension.

Store the original intent/base and current server state in `conflicts`, block
dependent operations, and let unrelated work continue. Replay compatible pending
intent for a clearly marked local preview. If an intent cannot be replayed (for
example editing a remotely deleted deck), retain its attempted state in the
conflict record instead of resurrecting the deck as normal data.

Resolution is itself a local core command:

* **Use server:** retire the conflicting overlay locally, record the decision,
  and review/rebase or discard dependent intents explicitly.
* **Keep mine/merge:** record the resolution locally and enqueue a new operation
  with a new ID against the displayed server revision. A further server edit can
  conflict again; “keep mine” is not unconditional permission to overwrite.

Absolute count changes, bulk replacements, deletes, and imports all follow this
rule. Add/remove commands preserve semantic intent but are not blindly replayed
over conflicting server revisions. Undo of an already delivered command is a
new compensating command; uncertain sends must be settled before cancellation.

| Failure | Durable action |
| --- | --- |
| Offline, timeout, transient network error, server 5xx | Retain request; exponential backoff with jitter |
| 429 | Honor `Retry-After`, then retry the same request |
| 401 | Pause the partition; persist `auth-required`; resume after matching sign-in |
| 403 | Stop blind retries; retain rejected intent and require permission/resolution |
| Revision conflict or remote deletion | Persist conflict and block dependencies |
| Invalid command/domain validation | Persist terminal failure; keep attempted edit available |
| Unsupported schema/protocol | Pause affected work and require a compatible app update |
| IndexedDB failure/quota | Fail local save; never fall through to a server write |

## 12. Wake-ups, concurrency, and accounts

After committing work, the engine wakes the sync host. A failed wake-up leaves
durable work queued and shows unavailable sync; it never reroutes traffic.

The following all wake the same `runSyncSlice` implementation:

* Successful local enqueue and explicit retry/refresh.
* Application startup, focus/visibility restoration, and the `online` event.
* A modest visible-page timer while work is pending/due.

`navigator.onLine` is a scheduling hint; requests determine actual reachability.
Persist retry deadlines. Timers only wake the host; they never drain work.
Nothing runs while every tab is closed: queued work resumes when the app is next
open.

Acquire a partition lease transactionally in IndexedDB, with an owner token,
expiry, and increasing fence. Renew during bounded work; verify the fence before
local reconciliation. Two tabs' hosts may still send duplicate requests,
which the server deduplicates. Only the current owner may advance local state.
No in-memory boolean is sufficient for cross-event or cross-version exclusion.

Every page, message, and async result carries an account generation. Account
switching first pauses sync and changes that generation in a control transaction.
Abort in-flight requests where possible; discard stale local callbacks. The
server still checks the session against the envelope account on every request.
Already accepted operations remain attributed to their original account and can
be settled when that partition is reopened. Never flush account A's queue as B.

The server mints **signed bearer access tokens (15 minutes)** and **rotating signed
refresh tokens (30 days absolute lifetime)**. Both carry a signed `generation`
claim. The principal's `Users.token_generation` is checked on every authenticated
request and refresh, in addition to signature, expiry, token type, and family
revocation. Incrementing that one database field invalidates all of the principal's
tokens immediately; `POST /auth/revoke-all` performs that increment for the current
principal. This generation is independent of the client account generation used
to fence asynchronous callbacks. Production routes accept
`Authorization: Bearer <accessToken>` and do not authenticate using cookies.
Login/setup return a token pair; `POST /auth/refresh` rotates it, and logout revokes
the individual device's token family. Token hashes, expiry, family, principal
generation, refresh-attempt records, and the server signing key persist in SQLite,
so a server restart does not invalidate every device. Protect database backups as
server credentials; never export signing keys through the API.

The worker's HTTP adapter adds the bearer header, refreshes near-expiry tokens,
and retries an unauthorized request once with renewed credentials. Frozen domain
commands keep their operation IDs across this retry. Both window-facing core calls
and background sync share this adapter and the same private auth storage.

Access/refresh tokens are kept in an IndexedDB **auth control record**, isolated
from Redux, event ledgers, command payloads, read projections, caches, and exports.
Passwords are never persisted. The worker records a refresh attempt ID before
sending it; the server atomically rotates the refresh token and can reproduce the
same token response for that attempt if delivery is lost. Reusing an old refresh
token with a different attempt ID revokes the token family. A transaction compares
account generation and the prior credential before installing a rotated pair, so
an old worker cannot overwrite a newer sign-in. Tokens never appear in URLs/logs.
Refresh-token rotation and replay detection follow
[RFC 9700, refresh token protection](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14).

An offline restart can reopen a previously authorized local partition without a
network session check. This is access to stored device data, not renewed server
authorization. A fresh install requires an online sign-in and initial download.

Authentication is a control operation, not synchronized domain content. Persist
its non-secret intent/status through the same core/IndexedDB boundary; send
sign-in credentials to the worker transiently and never store passwords or bearer
credentials in the domain outbox. A worker restart during
sign-in requires entering credentials again. Store the resulting non-secret
identity/status in IndexedDB before updating Redux. Profile edits remain ordinary
durable domain commands.

Offline sign-out locks the local partition and records pending session revocation.
On reconnect, process revocation before opening a new session or resuming writes.
Distinguish local lock from confirmed server logout. Preserve pending private work
behind the lock until the same account signs in; require explicit discard/export
before deleting it. Browser storage is not encrypted simply because it is partitioned.

## 13. PWA installation, assets, and storage

Provide a manifest with stable `id`, `start_url`, scope, name, standalone display,
theme colors, and appropriate regular/maskable icons. Serve the application and
API over HTTPS, preferably through one origin with `/api` reverse-proxied.

`ShellWorker` (`src/workers/shell/`, built to `/sw.js` by `tools/shell-worker.mjs`)
only serves files. It precaches the built HTML, JS, CSS, icons, and small WASM,
answers same-origin navigations with the cached `index.html` so deep links open
offline, and caches `/assets/` files (including the fingerprinted mana symbols) on first use. It ignores
`/api/` entirely and holds no application data; IndexedDB holds structured state,
durable commands, and saved blobs, which the page turns into object URLs.

It registers on a secure context (localhost or a trusted certificate). Where it
cannot, the app behaves the same but needs the network to load. The dev server
serves it at `/sw.js` too, and development builds register it as
`/sw.js?mode=development`: it then precaches nothing and goes network-first, so
every edit shows at once and the last copy of each file serves when the dev server
is down. Each dev server start drops what the previous one cached. The Profile
page shows whether the worker is installed on this device.

Downloading large OCR models/card packs is explicit, resumable, and size-aware.
Do not include every model in the mandatory install transaction. Show offline
capability per pack; unavailable OCR/search data must be clear to the user.
Computation stays in existing dedicated workers. Their recognized-card edits and
saved results reenter Redux thunks and the same core flow.

Uploads first commit their Blob and command reference in IndexedDB. The worker
uploads by stable content/operation ID and only then sends dependent commands.
Large uploads use resumable chunks with durable progress; never depend on one
long-lived worker event. Keep unsent blobs pinned. Read-only downloaded media can
be evicted independently from authoritative domain state.

Request persistent storage after the user enables offline use; inspect storage
estimates and expose usage, pending changes, download status, and export/recovery.
Evict reproducible images/catalog packs before private data. Persistence is not
guaranteed, and users can clear site data, so “saved on this device” is not a server
backup. See [MDN: storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

Never promise that a first-ever visit, or an origin without the shell worker, will start without a network. If IndexedDB is
unavailable, block persistent edits.

## 14. Updates and recovery

A new shell worker installs its build's cache, takes over immediately, and keeps
the previous build's cache so open tabs can still load its lazy chunks; the next
load runs the new build. Pending outbox work does not have to be uploaded
first.

Handshake on protocol/schema compatibility. Version command payloads so newer
workers can drain older queued commands. Prefer additive migrations and support
the prior active client version during rollout. Close IndexedDB connections on
`versionchange`; surface blocked upgrades and ask other tabs to reload. Never
delete/recreate the database to fix an upgrade error. Retain old shell assets
until old clients no longer need their chunks.

On launch, open storage, hydrate Redux, reclaim
expired leases, and request sync. A crash before an IndexedDB commit produces no
partial edit. A crash after server commit is recovered through the idempotency
receipt. A crash after local reconciliation but before notification is recovered
by revision checks and local rereads.

## 15. Implementation sequence

1. Define aggregate command/event/checkpoint schemas and pure reducers. Add server
   event/receipt transactions and migrate existing data to explicit opening-balance
   events. Route every existing writer through command handlers.
2. Implement core storage, the local intent journal, projections, checkpoint
   verification/replay, command transactions, subscriptions, and account partitions.
   Prove local edits survive reload and projections can be rebuilt from ledgers.
3. Build the worker and its single queue runner, authentication bridge, retry and
   reconciliation logic. Add server query/bootstrap/change endpoints.
4. Wire thunk dependency injection and the Redux local-snapshot bridge. Migrate a
   complete deck vertical slice: list/read, create, rename, add/set/remove cards,
   history, and deletion. Gate the entire slice together; no mixed write paths.
5. Migrate remaining domains, preferences, uploads, imports, profiles, and work
   items. Remove direct API access from UI and computation workers. Do not label
   the application fully local-first while any domain still bypasses the core.
6. Ship the manifest, HTTPS setup, shell caching, optional asset packs, storage
   management, and coordinated update flow. Validate installed and browser modes.

## 16. Acceptance checks

| Scenario | Required result |
| --- | --- |
| Delete all derived read models and rebuild | Checkpoint plus event suffix and unresolved local journal reproduce the same state |
| Checkpoint at 100 events or dirty age threshold | Complete accepted prefix is balanced; pending intent remains outstanding |
| Corrupt checkpoint, event gap, duplicate event, or partial batch | Verification rejects corruption/gaps; duplicates are harmless; batches apply atomically |
| New local edit during checkpoint creation | Checkpoint covers only captured accepted prefix; edit survives publication |
| Replay an older event schema with a newer projector | Upcasting is deterministic, derived views rebuild, and no side effect repeats |
| Query and feed deliver the same accepted event | Event identity/sequence and projection watermarks prevent double application |
| Online edit with network artificially delayed | Local commit renders first; worker later syncs the same command |
| Airplane mode, edit/create, reload, reconnect | Local IDs/data survive; server receives each operation once |
| Terminate worker before/after server commit and before local acknowledgement | Retry settles the original operation with no duplicate history/count/upload |
| Refresh arrives while an edit is pending | Fresh base and pending overlay coexist; edit is not erased or doubled |
| Lose write response, then refresh | Snapshot operation outcomes prevent applying accepted intent twice |
| Two offline devices edit the same aggregate | Visible conflict; no silent overwrite; independent aggregates keep syncing |
| Two tabs edit; update causes overlapping workers | Durable sequence ordering, fenced reconciliation, idempotent delivery |
| Refreshes/notifications arrive out of order or disappear | Revisions prevent regression; startup/focus rereads recover |
| Remote deletion or a missing paginated list member | Explicit tombstones delete; page omission alone does not |
| Quota error or aborted local transaction | Neither local projection nor outbox changes; no server request |
| Expired login; switch accounts during a send | Queue pauses; no cross-account read, display, or replay |
| No Background Sync support; close and reopen | Pending work survives and resumes through the worker |
| Deep-link launch offline after installation | Shell renders and Redux hydrates from IndexedDB |
| Cursor expiry or blocked database upgrade with pending edits | Safe resnapshot/migration; outbox retained |
| Missing card catalog, image, or OCR pack | Explicit partial/offline capability with usable downloaded data |
| Trace every application API request | It originates in the core worker after its intent/job was persisted |

Use transaction/projection tests for atomicity and replay, server integration tests
for receipts and concurrency, and real-browser tests for worker termination,
offline deep links, multiple tabs, and upgrades. Exercise target desktop and mobile
browsers with Background Sync disabled as well as enabled. The central proof is
that online, offline, and SWR behavior all use the same persisted pipeline.
