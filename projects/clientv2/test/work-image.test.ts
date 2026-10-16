import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkApi } from '../src/engine/api/work';
import type { WorkItem } from '../src/domain/models/work';

const BLOB_ID = 'blob_558be0e078c48580f04e21300f313a84878c5e8eada35a49c44d803d056959a7';

function item(imageUrl: string): WorkItem {
	return {
		workId: 'work_ACv5EzJD_9_eP-Ah',
		kind: 'card-image-ocr',
		deck: { deckId: 'deck_-bcquQOfhhMrXvgS', name: 'Deck' },
		status: 'pending',
		fileName: 'photo.jpeg',
		progress: { completed: 0, total: 0 },
		cardsAdded: 0,
		error: null,
		blobId: BLOB_ID,
		imageUrl,
		createdAt: '2026-10-16T15:13:43.250Z',
		updatedAt: '2026-10-16T15:13:43.250Z'
	};
}

/** A WorkApi whose engine holds `queued`, recording which blob ids are asked for where. */
function workApi(queued: WorkItem, onDevice: boolean) {
	const asked: string[] = [];
	const tori = {
		queries: { read: async () => ({ data: { items: [queued] } }) },
		blob: async (id: string) => {
			asked.push(`device:${id}`);
			if (!onDevice) throw new Error('This image is not downloaded on this device.');
			return new Blob(['jpeg'], { type: 'image/jpeg' });
		}
	};
	const reader = {
		resource: async (query: { type: string; id: string }) => {
			asked.push(`server:${query.id}`);
			return { body: new Blob(['jpeg'], { type: 'image/jpeg' }) };
		}
	};
	const api = new WorkApi(tori as never, reader as never, {} as never, {} as never);
	return { api, asked };
}

test('a queued photo is read by its upload id, not from its object URL', async () => {
	// The view shows the photo through an object URL; its last segment is a random UUID.
	const queued = item('blob:https://cube-light.mrobertevers.com/9c209703-1133-4f90-9d99-3095dee26b1e');
	const { api, asked } = workApi(queued, true);
	const file = await api.image(queued);
	assert.deepEqual(asked, [`device:${BLOB_ID}`]);
	assert.equal(file.name, 'photo.jpeg');
	assert.equal(file.type, 'image/jpeg');
});

test('a photo not on this device is downloaded by its upload id, even while its preview loads', async () => {
	const queued = item('data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==');
	const { api, asked } = workApi(queued, false);
	await api.image(queued);
	assert.deepEqual(asked, [`device:${BLOB_ID}`, `server:${BLOB_ID}`]);
});
