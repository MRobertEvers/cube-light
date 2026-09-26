import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardArtUpdateAvailable, type CardArtInfo } from '../src/domain/models/card-art';
import type { PackCard } from '../src/domain/models/card-pack';
import { CardArtApi } from '../src/engine/card-pack/card-art-api';
import type { CardArtStore } from '../src/engine/ports';

/** A store holding art for the given default printing uuids, counting lookups. */
function artStore(printings: string[]): CardArtStore & { lookups: string[] } {
	const lookups: string[] = [];
	return {
		lookups: lookups,
		offered: async () => null,
		installed: async () => null,
		install: async () => {
			throw new Error('not used');
		},
		remove: async () => {},
		art: async (uuid: string) => {
			lookups.push(uuid);
			return printings.includes(uuid) ? new Blob([uuid], { type: 'image/webp' }) : null;
		},
		asked: async () => false,
		markAsked: async () => {}
	};
}

/** A text pack naming each card's default printing. */
function packLibrary(defaults: Record<string, string>) {
	let revision = 0;
	return {
		card: async (name: string): Promise<PackCard | null> =>
			defaults[name] ? { name: name, faces: [], printing: { uuid: defaults[name], setCode: 'SET' } } : null,
		revision: () => revision,
		change: () => {
			revision++;
		}
	};
}

async function blobText(url: string | null): Promise<string | null> {
	return url ? (await fetch(url)).text() : null;
}

test('a default printing is drawn from its own art', async () => {
	const store = artStore(['bolt-default']);
	const api = new CardArtApi(store, packLibrary({ 'Lightning Bolt': 'bolt-default' }));
	assert.equal(await blobText(await api.artFor({ name: 'Lightning Bolt', uuid: 'bolt-default' })), 'bolt-default');
	assert.deepEqual(store.lookups, ['bolt-default']);
});

test('another printing is drawn from its name default printing art', async () => {
	const store = artStore(['bolt-default']);
	const api = new CardArtApi(store, packLibrary({ 'Lightning Bolt': 'bolt-default' }));
	assert.equal(await blobText(await api.artFor({ name: 'Lightning Bolt', uuid: 'bolt-promo' })), 'bolt-default');
	assert.deepEqual(store.lookups, ['bolt-promo', 'bolt-default']);
});

test('a card the pack has no art for has none, and the answer is kept', async () => {
	const store = artStore([]);
	const api = new CardArtApi(store, packLibrary({}));
	assert.equal(await api.artFor({ name: 'Unknown', uuid: 'unknown' }), null);
	assert.equal(await api.artFor({ name: 'Unknown', uuid: 'unknown' }), null);
	assert.deepEqual(store.lookups, ['unknown']);
});

test('a changed text pack finds art again', async () => {
	const store = artStore(['bolt-default']);
	const library = packLibrary({});
	const api = new CardArtApi(store, library);
	assert.equal(await api.artFor({ name: 'Lightning Bolt', uuid: 'bolt-promo' }), null);
	const later = packLibrary({ 'Lightning Bolt': 'bolt-default' });
	library.card = later.card;
	library.change();
	assert.equal(await blobText(await api.artFor({ name: 'Lightning Bolt', uuid: 'bolt-promo' })), 'bolt-default');
});

test('art whose index format changed is offered as an update', () => {
	const offered: CardArtInfo = { version: 'v1', format: 2, width: 240, cards: 1, bytes: 1, chunks: 1 };
	const installed = { version: 'v1', format: 1, width: 240, cards: 1, bytes: 1, chunks: 1, installedAt: 'then' };
	assert.equal(cardArtUpdateAvailable({ installed: installed, offered: offered, asked: true }), true);
	const current = { version: 'v1', format: 2, width: 240, cards: 1, bytes: 1, chunks: 1, installedAt: 'then' };
	assert.equal(cardArtUpdateAvailable({ installed: current, offered: offered, asked: true }), false);
});

test('art rebuilt at another width is offered as an update', () => {
	const offered: CardArtInfo = { version: 'v1', format: 2, width: 240, cards: 1, bytes: 1, chunks: 1 };
	const installed = { version: 'v1', format: 2, width: 160, cards: 1, bytes: 1, chunks: 1, installedAt: 'then' };
	assert.equal(cardArtUpdateAvailable({ installed: installed, offered: offered, asked: true }), true);
});
