import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardNamesUpdateAvailable, type CardNamesInfo, type CardPackInfo, type CardPackStatus, type InstalledCardPack } from '../src/domain/models/card-pack';
import { offlineDataUpdates } from '../src/domain/models/offline-data';
import { CardPackApi } from '../src/engine/card-pack/card-pack-api';
import type { CardPackLibrary } from '../src/engine/card-pack/card-pack-library';
import type { CardPackStore } from '../src/engine/ports';

const PACK: CardPackInfo = { version: 'v1', date: '2026-09-20', builtAt: 'then', cards: 2, bytes: 10, sha256: 'pack-1' };
const NAMES: CardNamesInfo = { version: 'v1', date: '2026-09-20', builtAt: 'then', names: 2, bytes: 5, sha256: 'names-1' };

function installedPack(sha256: string): InstalledCardPack {
	return { version: 'v1', date: '2026-09-20', builtAt: 'then', cards: 2, bytes: 10, sha256: sha256, installedAt: 'then' };
}

function status(pack: InstalledCardPack | null, namesHere: string | null): CardPackStatus {
	return { installed: pack, offered: PACK, namesHere: namesHere, namesOffered: NAMES };
}

test('a name index other than the one offered, or none, needs an update once card data is installed', () => {
	assert.equal(cardNamesUpdateAvailable(status(installedPack('pack-1'), 'names-0')), true);
	assert.equal(cardNamesUpdateAvailable(status(installedPack('pack-1'), null)), true);
	assert.equal(cardNamesUpdateAvailable(status(installedPack('pack-1'), 'names-1')), false);
	assert.equal(cardNamesUpdateAvailable(status(null, 'names-0')), false);
});

test('offline data updates name the card data when its name index is behind', () => {
	const art = { installed: null, offered: null, asked: true };
	assert.deepEqual(offlineDataUpdates(status(installedPack('pack-1'), 'names-0'), art), { cardData: true, cardArt: false });
	assert.deepEqual(offlineDataUpdates(status(installedPack('pack-1'), 'names-1'), art), { cardData: false, cardArt: false });
});

/** A card pack API over a store holding `here`, counting pack downloads and name index downloads. */
function packApi(here: InstalledCardPack | null) {
	const counts = { packs: 0, names: 0 };
	const store: CardPackStore = {
		offered: async () => PACK,
		offeredNames: async () => NAMES,
		installed: async () => here,
		install: async () => { throw new Error('not used'); },
		remove: async () => {},
		read: async () => null
	};
	const library = {
		install: async () => {
			counts.packs++;
			return installedPack('pack-1');
		}
	} as unknown as CardPackLibrary;
	const cards = {
		prepareNameSearch: async () => {},
		allNames: async () => [],
		nameIndexDigest: async () => 'names-0',
		redownloadNameIndex: async () => {
			counts.names++;
		}
	};
	return { api: new CardPackApi(store, library, cards), counts: counts };
}

test('updating current card data downloads only the name index again', async () => {
	const { api, counts } = packApi(installedPack('pack-1'));
	await api.install(() => {});
	assert.deepEqual(counts, { packs: 0, names: 1 });
});

test('updating outdated card data downloads the pack and the name index', async () => {
	const { api, counts } = packApi(installedPack('pack-0'));
	const installed = await api.install(() => {});
	assert.equal(installed.sha256, 'pack-1');
	assert.deepEqual(counts, { packs: 1, names: 1 });
});

test('the status reports the name index here and the one offered', async () => {
	const { api } = packApi(installedPack('pack-1'));
	const found = await api.status();
	assert.equal(found.namesHere, 'names-0');
	assert.equal(found.namesOffered?.sha256, 'names-1');
});
