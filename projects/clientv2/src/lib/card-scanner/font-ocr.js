// Closed-vocabulary optical text matching. Compares rendered glyphs, never artwork.
import { rectifyPlane } from './rectify-plane.js';
import { titleProposals } from './title-proposals.js';
import {
	findTitleStrips,
	stripCanvas,
	tightInkCrops,
	lightTitleBand,
	mserInkCrops
} from './edge-titles.js';
const W = 96,
	H = 16,
	D = W * H;
/**
 * @param {import('./types.js').ScanImage} input
 * @param {number} [shearArg]
 * @param {number} [blurArg]
 */
function descriptor(input, shearArg, blurArg) {
	const shear = shearArg === undefined ? 0 : shearArg;
	const blur = blurArg === undefined ? 0 : blurArg;

	const c = document.createElement('canvas');
	c.width = W;
	c.height = H;
	const ctx = c.getContext('2d', { willReadFrequently: true });
	ctx.fillStyle = '#dddddd';
	ctx.fillRect(0, 0, W, H);
	ctx.scale(W / input.width, H / input.height);
	ctx.transform(1, 0, -shear, 1, (shear * input.height) / 2, 0);
	ctx.filter = `blur(${blur}px)`;
	ctx.drawImage(input, 0, 0);
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	const p = ctx.getImageData(0, 0, W, H).data,
		v = new Float32Array(D),
		proj = new Float32Array(W);
	for (let y = 0; y < H; y++) {
		let mean = 0;
		for (let x = 0; x < W; x++) {
			const i = (y * W + x) * 4;
			v[y * W + x] = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
			mean += v[y * W + x] / W;
		}
		for (let x = 0; x < W; x++) {
			v[y * W + x] = mean - v[y * W + x];
			proj[x] += v[y * W + x];
		}
	}
	const norm = Math.hypot(...v) || 1,
		pnorm = Math.hypot(...proj) || 1;
	for (let i = 0; i < D; i++) v[i] /= norm;
	for (let i = 0; i < W; i++) proj[i] /= pnorm;
	return { v, proj };
}
/**
 * @param {string[]} names
 * @param {number} [blurArg]
 * @param {string} [fontFileArg]
 * @param {import('./types.js').ProgressCallback} [onProgressArg]
 */
async function makeFontIndex(names, blurArg, fontFileArg, onProgressArg) {
	const blur = blurArg === undefined ? 0 : blurArg;
	const fontFile = fontFileArg === undefined ? 'beleren.woff' : fontFileArg;
	const onProgress =
		onProgressArg === undefined ? function () {} : onProgressArg;

	const font = await new FontFace(
		'OCRFont',
		`url(/ocr/models/fonts/${fontFile})`
	).load();
	document.fonts.add(font);
	const c = document.createElement('canvas'),
		ctx = c.getContext('2d', { willReadFrequently: true }),
		features = new Float32Array(names.length * D),
		projections = new Float32Array(names.length * W);
	for (let i = 0; i < names.length; i++) {
		ctx.font = '32px OCRFont';
		const m = ctx.measureText(names[i]),
			a = Math.ceil(m.actualBoundingBoxAscent),
			d = Math.ceil(m.actualBoundingBoxDescent);
		c.width = Math.max(1, Math.ceil(m.width));
		c.height = Math.max(1, a + d);
		ctx.font = '32px OCRFont';
		ctx.fillStyle = 'white';
		ctx.fillRect(0, 0, c.width, c.height);
		ctx.fillStyle = 'black';
		ctx.fillText(names[i], 0, a);
		const f = descriptor(c, 0, blur);
		features.set(f.v, i * D);
		projections.set(f.proj, i * W);
		if (i % 1000 === 0) {
			onProgress({ completed: i, total: names.length });
			await new Promise((r) => setTimeout(r, 0));
		}
	}
	onProgress({ completed: names.length, total: names.length });
	return { names, features, projections };
}
/**
 * @param {import('./types.js').ScanImage} c
 * @param {Awaited<ReturnType<typeof makeFontIndex>>} index
 * @param {number} [shearArg]
 */
function lookup(c, index, shearArg) {
	const shear = shearArg === undefined ? 0 : shearArg;

	const f = descriptor(c, shear),
		short = [];
	for (let i = 0; i < index.names.length; i++) {
		let score = 0;
		for (let j = 0; j < W; j++)
			score += f.proj[j] * index.projections[i * W + j];
		if (short.length < 100 || score > short.at(-1).score) {
			short.push({ i, score });
			short.sort((a, b) => b.score - a.score);
			if (short.length > 100) short.pop();
		}
	}
	return short
		.map(
			/**
			 * @param {{ i: number; score: number; }} options
			 */
			(options) => {
				const { i } = options;

				let score = 0;
				for (let j = 0; j < D; j++)
					score += f.v[j] * index.features[i * D + j];
				return { name: index.names[i], score };
			}
		)
		.sort((a, b) => b.score - a.score)
		.slice(0, 5);
}

/**
 * @param {Array<Array<import('../../workers/title-index.worker').ShardMatch>>} shards
 * @param {string[]} names
 */
function mergeShards(shards, names) {
	return shards
		.flat()
		.sort((a, b) => b.projection - a.projection)
		.slice(0, 100)
		.sort((a, b) => b.score - a.score)
		.slice(0, 5)
		.map((m) => ({ name: names[m.i], score: m.score }));
}

/**
 * Builds the index across a pool of workers, each holding a slice of the catalog,
 * so building and searching run in parallel and off the page's thread. Falls back
 * to building it here when workers cannot render the font.
 *
 * @param {string[]} names
 * @param {number} [blurArg]
 * @param {string} [fontFileArg]
 * @param {import('./types.js').ProgressCallback} [onProgressArg]
 * @returns {Promise<{lookup: (c: import('./types.js').ScanImage) => Promise<import('./types.js').NameMatch[]>, dispose: () => void}>}
 */
async function createTitleIndex(names, blurArg, fontFileArg, onProgressArg) {
	const blur = blurArg === undefined ? 0 : blurArg;
	const fontFile = fontFileArg === undefined ? 'beleren.woff' : fontFileArg;
	const onProgress =
		onProgressArg === undefined ? function () {} : onProgressArg;
	const size = Math.max(
			1,
			Math.min(4, (navigator.hardwareConcurrency || 2) - 1)
		),
		shard = Math.ceil(names.length / size),
		workers = [],
		/** @type {Map<number, {results: object[], remaining: number, resolve: (v: object[]) => void, reject: (e: Error) => void}>} */
		pending = new Map(),
		completed = new Array(size).fill(0);
	let next = 0;
	function fail(/** @type {Error} */ error) {
		for (const call of pending.values()) call.reject(error);
		pending.clear();
	}
	function dispose() {
		for (const worker of workers) worker.terminate();
		fail(new Error('Title index closed'));
	}
	try {
		await Promise.all(
			Array.from({ length: size }, function (_, k) {
				const worker = new Worker(
					new URL(
						'../../workers/title-index.worker.ts',
						import.meta.url
					),
					{ type: 'module' }
				);
				workers.push(worker);
				return new Promise(function (resolve, reject) {
					worker.onerror = (e) =>
						reject(
							new Error(e.message || 'Title index worker failed')
						);
					worker.onmessage = function (event) {
						const message = event.data;
						if (message.kind === 'progress') {
							completed[k] = message.completed;
							onProgress({
								completed: completed.reduce((a, b) => a + b, 0),
								total: names.length
							});
						} else if (message.kind === 'failed')
							reject(new Error(message.error));
						else if (message.kind === 'built') resolve(undefined);
						else {
							const call = pending.get(message.id);
							if (!call) return;
							call.results[k] = message.matches;
							if (--call.remaining === 0) {
								pending.delete(message.id);
								call.resolve(call.results);
							}
						}
					};
					worker.postMessage({
						kind: 'build',
						names: names.slice(k * shard, (k + 1) * shard),
						offset: k * shard,
						blur,
						fontUrl: new URL(
							`/ocr/models/fonts/${fontFile}`,
							location.origin
						).href
					});
				});
			})
		);
	} catch (error) {
		dispose();
		console.warn('Title index workers unavailable; building here', error);
		const index = await makeFontIndex(names, blur, fontFile, onProgress);
		return {
			lookup: async (c) => lookup(c, index),
			dispose: function () {}
		};
	}
	for (const worker of workers)
		worker.onerror = (e) =>
			fail(new Error(e.message || 'Title index worker failed'));
	return {
		lookup: function (c) {
			const { v, proj } = descriptor(c),
				id = next++;
			return new Promise(function (resolve, reject) {
				pending.set(id, {
					results: [],
					remaining: workers.length,
					resolve: (shards) => resolve(mergeShards(shards, names)),
					reject
				});
				for (const worker of workers)
					worker.postMessage({ kind: 'lookup', id, v, proj });
			});
		},
		dispose
	};
}

export { makeFontIndex, lookup, createTitleIndex };
