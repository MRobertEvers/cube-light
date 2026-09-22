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

export { makeFontIndex, lookup };
