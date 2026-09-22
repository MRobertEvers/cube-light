import type { CardEdit, DomainCommand, Query, ResourceQuery, StoredResource } from '@torimtg/core';
import type { ToriMTG } from './types';

/** Existing UI helpers retain their return shapes; every operation is a Redux thunk. */
export type DataRunner = <T>(work: (core: ToriMTG) => Promise<T>) => Promise<T>;
let dispatchData: DataRunner | null = null;
export function bindDataRunner(runner: DataRunner): void { dispatchData = runner; }
export function withCore<T>(work: (core: ToriMTG) => Promise<T>): Promise<T> {
    if (!dispatchData) throw new Error('ToriMTG must be connected to the Redux store.');
    return dispatchData(work);
}

export function newId(kind: string): string {
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    return `${kind}_${btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_')}`;
}

export async function readAvailable<T>(core: ToriMTG, query: Query): Promise<T> {
    const snapshot = await core.queries.read<T>(query);
    await core.queries.requestRefresh(query);
    if (snapshot.presence !== 'missing') return snapshot.data as T;
    return new Promise<T>((resolve, reject) => {
        let done = false;
        const timeout = setTimeout(() => finish(new Error('Not available on this device yet. Connect to download it.')), 18000);
        const unsubscribe = core.subscribe(check);
        function finish(error?: Error, value?: T) {
            if (done) return;
            done = true; clearTimeout(timeout); unsubscribe();
            if (error) reject(error); else resolve(value as T);
        }
        async function check() {
            try {
                const result = await core.queries.read<T>(query);
                if (result.presence !== 'missing') finish(undefined, result.data as T);
                else if (result.lastError) finish(new Error(result.lastError));
            } catch (error) { finish(error instanceof Error ? error : new Error('Local read failed.')); }
        }
        void check();
    });
}

function json(value: unknown, status?: number): Response {
    return new Response(JSON.stringify(value ?? null), { status: status === undefined ? 200 : status, headers: { 'Content-Type': 'application/json' } });
}

async function resource(core: ToriMTG, query: ResourceQuery): Promise<Response> {
    const result = await readAvailable<StoredResource>(core, { type: 'resource', resource: query });
    return new Response(result.body, { status: result.status, headers: { 'Content-Type': result.contentType } });
}

async function resolveCard(core: ToriMTG, name: string, setCode?: string): Promise<any> {
    const result = await resource(core, { type: 'card.resolve', name, ...(setCode ? { setCode } : {}) });
    return result.json();
}

async function importedEdits(core: ToriMTG, cards: { name: string; count: number; setCode?: string }[]): Promise<CardEdit[]> {
    const edits: CardEdit[] = [];
    for (const card of cards) {
        const resolved = await resolveCard(core, card.name, card.setCode);
        edits.push({ uuid: resolved.uuid, action: 'add', count: card.count });
    }
    return edits;
}

async function saveCommand(core: ToriMTG, command: DomainCommand): Promise<Response> {
    await core.commands.execute(command); return json({ success: true });
}

export async function localApiRequest(input: RequestInfo | URL, options?: RequestInit): Promise<Response> {
    const init = options === undefined ? {} : options;
    if (init.signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.origin);
    const path = url.pathname.replace(/^\/api(?=\/)/, '').replace(/\/$/, '');
    const method = (init.method || 'GET').toUpperCase();
    const body = typeof init.body === 'string' && init.body.startsWith('{') ? JSON.parse(init.body) : {};
    return withCore(async (core) => {
        if (path === '/auth/session') return json(await core.session());
        if (path === '/auth/login' || path === '/auth/setup') return json({ user: await core.signIn(body.username, body.password, path.endsWith('setup')) });
        if (path === '/auth/logout') { await core.signOut(); return json({ success: true }); }
        const session = await core.session();
        if (!session.user) return json({ error: 'Sign in required' }, 401);
        if (path === '/auth/profile') {
            await core.commands.execute({ type: 'profile.artwork', id: `profile_${session.user.id}`, userId: session.user.id, profile: body });
            const profile = await core.queries.read<{ profile: unknown }>({ type: 'profile' });
            return json({ user: { ...session.user, profile: profile.data?.profile || null } });
        }
        if (path === '/cards/details') return resource(core, { type: 'card.details', uuid: url.searchParams.get('uuid') || '' });
        if (path === '/cards/printings') return resource(core, { type: 'card.printings', name: url.searchParams.get('name') || '' });
        if (path === '/suggest') return resource(core, { type: 'card.suggestions', stub: url.searchParams.get('stub') || '' });
        if (path.startsWith('/suggest/card-names/')) {
            const format = path.split('/').pop();
            if (format === 'wasm' || format === 'all' || format === 'index') return resource(core, { type: 'card.names', format });
        }
        if (path === '/decks' && method === 'POST') {
            const id = newId('deck'); await core.commands.execute({ type: 'deck.create', id, name: body.name }); return json({ deckId: id });
        }
        if (path === '/decks') return json(await readAvailable(core, { type: 'decks' }));
        const deckRoute = /^\/decks\/([^/]+)(?:\/(.*))?$/.exec(path);
        if (deckRoute) {
            const id = deckRoute[1], endpoint = deckRoute[2] || '';
            if (!endpoint && method === 'GET') return json(await readAvailable(core, { type: 'deck', id }));
            if (!endpoint && method === 'DELETE') return saveCommand(core, { type: 'deck.delete', id });
            if (!endpoint && method === 'PUT') {
                let art: string | undefined;
                if (body.bannerCardUuid) art = (await (await resource(core, { type: 'card.details', uuid: body.bannerCardUuid })).json()).art;
                return saveCommand(core, { type: 'deck.details', id, name: body.name, ...(body.bannerCardUuid ? { bannerCardUuid: body.bannerCardUuid, ...(art ? { art } : {}) } : {}) });
            }
            if (endpoint === 'history') return json(await readAvailable(core, { type: 'history', id }));
            if (endpoint === 'palette') return saveCommand(core, { type: 'deck.palette', id, palette: body.palette });
            if (endpoint === 'banner-crop') return saveCommand(core, { type: 'deck.crop', id, crop: body.bannerCrop });
            if (endpoint === 'top-style') return saveCommand(core, { type: 'deck.style', id, topStyle: body.topStyle });
            if (endpoint === 'cards' && method === 'POST') {
                const card = await resolveCard(core, body.cardName);
                return saveCommand(core, { type: 'deck.cards', id, edits: [{ uuid: card.uuid, action: body.action || 'add', count: body.count ?? 1 }] });
            }
            if (endpoint === 'cards/edit') {
                // Download missing printings before saving; their UUIDs remain the durable identity.
                for (const card of body.upsert) await resource(core, { type: 'card.details', uuid: card.uuid });
                return saveCommand(core, { type: 'deck.cards', id, edits: [...body.remove.map((uuid: string) => ({ uuid, action: 'set' as const, count: 0 })), ...body.upsert.map((card: { uuid: string; count: number }) => ({ ...card, action: 'set' as const }))] });
            }
            if (endpoint === 'cards/import') return saveCommand(core, { type: 'deck.cards', id, edits: await importedEdits(core, body.cards) });
            if (endpoint === 'banner-blend' && method === 'PUT') {
                const images = {} as { desktop: string; mobile: string; tile: string };
                for (const variant of ['desktop', 'mobile', 'tile'] as const) {
                    const bytes = Uint8Array.from(atob(body.images[variant]), (character) => character.charCodeAt(0));
                    images[variant] = await core.saveBlob(new Blob([bytes], { type: 'image/png' }));
                }
                return saveCommand(core, { type: 'deck.blend', id, blend: { source: body.source, crop: body.crop, config: body.config, images } });
            }
        }
        for (const kind of ['collection', 'location'] as const) {
            const route = kind === 'collection' ? '/collection' : '/storage-location';
            if (path === route && method === 'POST') {
                const id = newId(kind); await core.commands.execute({ type: `${kind}.create`, id, name: body.name });
                return json(kind === 'collection' ? { collection_id: id } : { storage_location_id: id });
            }
            if (path === `${route}/search`) return json(await readAvailable(core, { type: kind === 'collection' ? 'collections' : 'locations' }));
        }
        if (path === '/work' && method === 'GET') return json(await readAvailable(core, { type: 'work' }));
        if (path === '/work/card-image-ocr') {
            if (!(init.body instanceof Blob)) throw new Error('The queued scan needs an image.');
            const id = newId('work'), blobId = await core.saveBlob(init.body);
            await core.commands.execute({ type: 'work.queue', id, deckId: url.searchParams.get('deckId') || '', fileName: url.searchParams.get('fileName') || 'photo', contentType: init.body.type || 'image/jpeg', blobId, pipeline: url.searchParams.get('pipeline') === 'paddle-only' ? 'paddle-only' : 'card-aware' });
            const snapshot = await core.queries.read<{ items: { workId: string }[] }>({ type: 'work' });
            return json(snapshot.data?.items.find((item) => item.workId === id));
        }
        const workRoute = /^\/work\/([^/]+)(?:\/(.*))?$/.exec(path);
        if (workRoute) {
            const id = workRoute[1], endpoint = workRoute[2] || '';
            if (endpoint === 'image') {
                const snapshot = await core.queries.read<{ items: { workId: string; imageUrl: string }[] }>({ type: 'work' });
                const item = snapshot.data?.items.find((item) => item.workId === id);
                if (!item) return json({ error: 'Scan not found' }, 404);
                const blobId = item.imageUrl.split('/').pop()!;
                try { return new Response(await core.blob(blobId)); } catch { return resource(core, { type: 'blob', id: blobId }); }
            }
            if (endpoint === 'claim') {
                const token = crypto.randomUUID();
                const commit = await core.commands.execute({ type: 'work.start', id, token });
                // A distributed lease cannot be granted offline. Wait for this recorded intent's receipt.
                await waitAccepted(core, commit.operationId); return json({ token });
            }
            if (endpoint === 'progress') return saveCommand(core, { type: 'work.progress', id, token: body.token, completed: body.completed, total: body.total });
            if (endpoint === 'fail') return saveCommand(core, { type: 'work.fail', id, token: body.token, error: String(body.error).slice(0, 500) });
            if (endpoint === 'release') return saveCommand(core, { type: 'work.release', id, token: typeof init.body === 'string' ? init.body : body.token });
            if (endpoint === 'retry') return saveCommand(core, { type: 'work.retry', id });
            if (!endpoint && method === 'DELETE') return saveCommand(core, { type: 'work.delete', id });
            if (endpoint === 'complete') {
                const items = await core.queries.read<{ items: { workId: string; deck: { deckId: string } | null }[] }>({ type: 'work' });
                const deckId = items.data?.items.find((item) => item.workId === id)?.deck?.deckId;
                if (!deckId) throw new Error('The destination deck is unavailable.');
                const edits = await importedEdits(core, body.cards);
                return saveCommand(core, { type: 'work.complete', id, token: body.token, edits, deckId, deckRevision: -1 });
            }
        }
        throw new Error(`No local-first adapter for ${method} ${path}.`);
    });
}

async function waitAccepted(core: ToriMTG, operationId: string): Promise<void> {
    const started = Date.now();
    while (Date.now() - started < 20000) {
        const intent = (await core.pending()).find((item) => item.operationId === operationId);
        if (!intent) return;
        if (['conflict', 'rejected'].includes(intent.status)) throw new Error(intent.error || 'Another device is running this scan.');
        await new Promise<void>((resolve) => setTimeout(resolve, 200));
    }
    throw new Error('Connect to the server to claim this scan.');
}
