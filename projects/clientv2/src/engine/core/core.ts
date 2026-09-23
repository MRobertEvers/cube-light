import type {
	AccountScope,
	DomainCommand,
	EventEnvelope,
	LocalSnapshot,
	PublicUser,
	Query,
	Session,
	StoredResource
} from '@torimtg/core';
import type {
	Dataset,
	Intent,
	LocalCommit,
	LocalNotice,
	LocalStore,
	ToriMTG
} from './types';
import type { BlobUrlResolver, PageLifecycle, SyncHost } from '../ports';
import { outstanding, queryKey } from '../local-store/local-store';
import { projectQuery } from './projections';
import {
	detailsOf,
	isCardSource,
	overviewOf,
	recordCards,
	type CardCatalog
} from './card-catalog';

export function createToriMTG(
	store: LocalStore,
	worker: SyncHost,
	blobs: BlobUrlResolver,
	lifecycle: PageLifecycle
): ToriMTG {
	const listeners = new Set<(notice: LocalNotice) => void>();
	const channel =
		typeof BroadcastChannel !== 'undefined'
			? new BroadcastChannel('torimtg-commits')
			: null;
	let started = false;
	function emit(notice: LocalNotice) {
		for (const listener of listeners) listener(notice);
	}
	worker.subscribe(emit);
	if (channel)
		channel.onmessage = function (event) {
			emit(event.data);
		};
	function committed(notice: LocalNotice) {
		emit(notice);
		channel?.postMessage(notice);
	}
	function wake() {
		void worker.wake().catch(() => undefined);
	}
	async function scope(): Promise<AccountScope> {
		const scope = await store.scope();
		if (!scope) throw new Error('Sign in to access saved data.');
		return scope;
	}
	async function open(): Promise<void> {
		await store.open();
		if (!started) {
			started = true;
			lifecycle.onResume(wake);
			setInterval(() => {
				if (lifecycle.isVisible()) wake();
			}, 15000);
			void worker.connect().catch(() => undefined);
			// Publish what is already saved, so the status does not wait on a sync pass.
			const active = await store.scope();
			if (active)
				emit({
					partition: active.partition,
					generation: active.generation,
					localRevision: (await store.dataset(active)).meta.revision
				});
		}
	}
	// Every catalog or resource write bumps the revision, so one parse serves all reads until then.
	let catalog: { key: string; cards: Promise<CardCatalog> } | null = null;
	function catalogOf(
		active: AccountScope,
		data: Dataset
	): Promise<CardCatalog> {
		const key = `${active.partition}:${active.generation}:${data.meta.revision}`;
		if (catalog?.key !== key) {
			const cards = buildCatalog(data);
			catalog = { key, cards };
			cards.catch(() => {
				if (catalog?.cards === cards) catalog = null;
			});
		}
		return catalog.cards;
	}
	async function read<T>(query: Query): Promise<LocalSnapshot<T>> {
		const active = await scope();
		const data = await store.dataset(active);
		const cards = await catalogOf(active, data);
		for (const resource of data.resources) {
			if (
				query.type !== 'history' ||
				!resource.contentType.includes('json')
			)
				continue;
			const descriptor = JSON.parse(resource.key);
			if (descriptor.type === 'history' && descriptor.id === query.id) {
				const archive:
					| EventEnvelope[]
					| { events: EventEnvelope[]; legacy: unknown[] } =
					await resource.body
						.text()
						.then(JSON.parse)
						.catch(() => []);
				const archived = Array.isArray(archive)
					? archive
					: archive.events;
				data.legacyHistory = Array.isArray(archive)
					? []
					: archive.legacy;
				const byId = new Map(
					archived.concat(data.events).map((event) => [
						event.eventId,
						event
					])
				);
				data.events = Array.from(byId.values());
			}
		}
		const pending = data.intents
			.filter(outstanding)
			.filter(
				(intent) => !('id' in query) || intent.command.id === query.id
			);
		let value: unknown;
		let presence: LocalSnapshot['presence'];
		if (query.type === 'resource') {
			value =
				data.resources.find(
					(resource) => resource.key === queryKey(query.resource)
				) || null;
			if (
				!value &&
				(query.resource.type === 'card.details' ||
					query.resource.type === 'card.resolve')
			) {
				const descriptor = query.resource;
				// Each request is answered only from a shape that holds what it asks for.
				const card =
					descriptor.type === 'card.details'
						? detailsOf(cards[descriptor.uuid])
						: Object.values(cards)
								.map(overviewOf)
								.find(
									(item) =>
										item &&
										item.name.toLowerCase() ===
											descriptor.name.toLowerCase() &&
										(!descriptor.setCode ||
											item.setCode.toLowerCase() ===
												descriptor.setCode.toLowerCase())
								);
				if (card)
					value = {
						key: queryKey(descriptor),
						body: new Blob([JSON.stringify(card)], {
							type: 'application/json'
						}),
						status: 200,
						contentType: 'application/json',
						validatedAt: data.meta.validatedAt || ''
					};
			}
			presence = value ? 'complete' : 'missing';
		} else {
			value = projectQuery(data, cards, blobs, query);
			presence =
				value === null
					? 'missing'
					: data.meta.bootstrap.complete
						? 'complete'
						: data.states.length
							? 'partial'
							: 'missing';
			if (
				query.type === 'deck' &&
				data.states.some(
					(state) => state.id === query.id && state.deleted
				)
			)
				presence = 'complete';
		}
		const current = await scope();
		if (
			current.partition !== active.partition ||
			current.generation !== active.generation
		)
			throw new Error('The active account changed.');
		return {
			data: value as T | null,
			presence,
			localRevision: data.meta.revision,
			lastValidatedAt: data.meta.validatedAt,
			pendingCount: pending.length,
			conflictCount: pending.filter((intent) =>
				['conflict', 'rejected'].includes(intent.status)
			).length,
			refresh: data.meta.refresh,
			lastError: data.meta.error
		};
	}
	async function requestRefresh(query?: Query): Promise<void> {
		const resource =
			query?.type === 'resource'
				? query.resource
				: query?.type === 'history'
					? { type: 'history' as const, id: query.id }
					: undefined;
		await store.refresh(await scope(), resource, query === undefined);
		wake();
	}
	async function execute(command: DomainCommand): Promise<LocalCommit> {
		const commit = await store.commit(await scope(), command);
		committed(commit);
		wake();
		return commit;
	}
	async function resolve(
		operationId: string,
		choice: 'server' | 'mine'
	): Promise<void> {
		committed(await store.resolve(await scope(), operationId, choice));
		wake();
	}
	async function session(): Promise<Session> {
		await open();
		const auth = await store.auth();
		if (auth.session?.user && !auth.locked) {
			// Hydrate without waiting for a server that may be unreachable.
			wake();
			return auth.session;
		}
		if (auth.locked && auth.session)
			return { user: null, setupRequired: false, serverInstanceId: auth.session.serverInstanceId };
		const id = await store.startAuth('session');
		await worker.authenticate(id);
		const updated = await store.auth();
		if (!updated.session)
			throw new Error(updated.error || 'Could not reach the server.');
		return updated.session;
	}
	async function signIn(
		username: string,
		password: string,
		setup: boolean
	): Promise<PublicUser> {
		await open();
		const id = await store.startAuth(setup ? 'setup' : 'login');
		await worker.authenticate(id, { username, password });
		const auth = await store.auth();
		if (!auth.session?.user || auth.locked)
			throw new Error(auth.error || 'Could not sign in.');
		committed({
			partition: `${auth.session.serverInstanceId}:${auth.session.user.id}:shared`,
			generation: auth.generation,
			localRevision: 0
		});
		wake();
		return auth.session.user;
	}
	async function signOut(): Promise<void> {
		const id = await store.startAuth('logout');
		committed({
			partition: '',
			generation: (await store.auth()).generation,
			localRevision: 0
		});
		// Lock immediately; revocation survives offline reload and precedes the next login.
		void worker.authenticate(id).catch(() => undefined);
	}
	async function saveBlob(blob: Blob): Promise<string> {
		return store.putBlob(await scope(), blob);
	}
	async function blob(id: string): Promise<Blob> {
		const saved = await store.getBlob(await scope(), id);
		if (saved) return saved.data;
		const query: Query = {
			type: 'resource',
			resource: { type: 'blob', id }
		};
		const result = await read<StoredResource>(query);
		if (result.data) return result.data.body;
		throw new Error('This image is not downloaded on this device.');
	}
	async function pending(): Promise<Intent[]> {
		return (await store.dataset(await scope())).intents.filter(outstanding);
	}
	async function exportPending(): Promise<Blob> {
		const active = await scope();
		const data = await store.dataset(active);
		const intents = data.intents.filter(outstanding);
		const ids = new Set(
			intents.flatMap((intent) =>
				intent.command.type === 'work.queue'
					? [intent.command.blobId]
					: intent.command.type === 'deck.blend'
						? Object.values(intent.command.blend.images)
						: []
			)
		);
		const blobs = [];
		for (const id of ids) {
			const local = await store.getBlob(active, id);
			if (!local) continue;
			const bytes = new Uint8Array(await local.data.arrayBuffer());
			let binary = '';
			for (let offset = 0; offset < bytes.length; offset += 8192)
				binary += String.fromCharCode.apply(
					null,
					Array.from(bytes.subarray(offset, offset + 8192))
				);
			blobs.push({
				id,
				contentType: local.data.type,
				base64: btoa(binary)
			});
		}
		return new Blob(
			[
				JSON.stringify(
					{
						version: 1,
						partition: active.partition,
						exportedAt: new Date().toISOString(),
						intents,
						states: data.states,
						blobs
					},
					null,
					2
				)
			],
			{ type: 'application/json' }
		);
	}
	function subscribe(listener: (notice: LocalNotice) => void): () => void {
		listeners.add(listener);
		return function () {
			listeners.delete(listener);
		};
	}
	return {
		commands: { execute, resolve },
		queries: { read, requestRefresh },
		open,
		subscribe,
		session,
		signIn,
		signOut,
		saveBlob,
		blob,
		pending,
		exportPending
	};
}

/** Catalog responses are stored separately from domain events and checkpoints. */
async function buildCatalog(data: Dataset): Promise<CardCatalog> {
	const cards: CardCatalog = {};
	for (const card of Object.values(data.catalog))
		recordCards(cards, 'sync', card);
	for (const resource of data.resources) {
		if (!resource.contentType.includes('json')) continue;
		const descriptor = JSON.parse(resource.key);
		if (isCardSource(descriptor.type))
			recordCards(
				cards,
				descriptor.type,
				await resource.body
					.text()
					.then(JSON.parse)
					.catch(() => null)
			);
	}
	return cards;
}
