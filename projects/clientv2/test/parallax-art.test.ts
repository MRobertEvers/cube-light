import { test } from 'node:test';
import assert from 'node:assert/strict';
import { depthMapUrl, loadDepthMap } from '../src/ui/kit/components/BannerArtwork/depth-map';

const ID = '67f4c93b-080c-4196-b095-6a120a221988';
const PAGE = 'https://cube.example/deck/deck_a';

test("only this server's art crops have height maps, beside the art", () => {
	assert.equal(depthMapUrl(`/api/images/art_crop/${ID}.jpg`, PAGE), `https://cube.example/api/images/depth/${ID}.png`);
	assert.equal(
		depthMapUrl(`https://api.cube.example/images/art_crop/${ID.toUpperCase()}.jpg?v=2`, PAGE),
		`https://api.cube.example/images/depth/${ID}.png`
	);
	assert.equal(depthMapUrl(`/api/images/normal/${ID}.jpg`, PAGE), null, 'a card image, not its art');
	assert.equal(depthMapUrl(`https://cards.scryfall.io/art_crop/front/6/7/${ID}.jpg`, PAGE), null);
	assert.equal(depthMapUrl('blob:https://cube.example/1234', PAGE), null, 'an offline pack art');
	assert.equal(depthMapUrl(null, PAGE), null);
});

type FakeResponse = { status: number; retryAfter?: string };

/** fetch answering each call with the next status; createImageBitmap a stand-in. */
function serve(answers: FakeResponse[]): { calls: () => number; restore: () => void } {
	const realFetch = globalThis.fetch;
	const realBitmap = (globalThis as { createImageBitmap?: unknown }).createImageBitmap;
	let calls = 0;
	globalThis.fetch = async function () {
		const answer = answers[Math.min(calls, answers.length - 1)];
		calls++;
		const headers = answer.retryAfter ? { 'Retry-After': answer.retryAfter } : undefined;
		return new Response(answer.status === 200 ? new Uint8Array([1, 2, 3]) : null, { status: answer.status, headers });
	};
	(globalThis as { createImageBitmap?: unknown }).createImageBitmap = async function () {
		return { width: 1, height: 1 };
	};
	return {
		calls() {
			return calls;
		},
		restore() {
			globalThis.fetch = realFetch;
			(globalThis as { createImageBitmap?: unknown }).createImageBitmap = realBitmap;
		}
	};
}

test('a map being made is asked for again after Retry-After; a missing one is not', async () => {
	const making = serve([{ status: 503, retryAfter: '1' }, { status: 200 }]);
	try {
		const started = Date.now();
		assert.ok(await loadDepthMap(`https://cube.example/api/images/depth/${ID}.png`, new AbortController().signal));
		assert.equal(making.calls(), 2);
		assert.ok(Date.now() - started >= 900, 'waited as the server asked');
	} finally {
		making.restore();
	}
	const missing = serve([{ status: 404 }]);
	try {
		assert.equal(await loadDepthMap(`https://cube.example/api/images/depth/${ID}.png`, new AbortController().signal), null);
		assert.equal(missing.calls(), 1);
	} finally {
		missing.restore();
	}
});
