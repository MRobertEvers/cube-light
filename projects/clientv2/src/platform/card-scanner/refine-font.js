import { getCV } from './edge-titles.js';
const W = 96,
	H = 16,
	D = W * H;
/**
 * @param {HTMLCanvasElement} c
 */
function features(c) {
	const ctx = c.getContext('2d', { willReadFrequently: true }),
		p = ctx.getImageData(0, 0, W, H).data,
		v = new Float32Array(D);
	for (let y = 0; y < H; y++) {
		let m = 0;
		for (let x = 0; x < W; x++) {
			const i = (y * W + x) * 4;
			v[y * W + x] = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
			m += v[y * W + x] / W;
		}
		for (let x = 0; x < W; x++) v[y * W + x] = m - v[y * W + x];
	}
	return v;
}
/**
 * @param {Float32Array} v
 */
function normalize(v) {
	const n = Math.hypot.apply(null, v) || 1;
	return v.map((x) => x / n);
}
/**
 * @param {Float32Array} v
 * @param {number} sx
 * @param {number} sy
 */
function blurred(v, sx, sy) {
	const kernel = function kernel(s) {
			const r = Math.ceil(s * 3),
				k = [];
			let sum = 0;
			for (let d = -r; d <= r; d++) {
				const a = Math.exp((-d * d) / (2 * s * s));
				k.push(a);
				sum += a;
			}
			return {
				k: k.map((v) => v / sum),
				r
			};
		},
		kx = kernel(sx),
		ky = kernel(sy),
		tmp = new Float32Array(D),
		out = new Float32Array(D);
	for (let y = 0; y < H; y++) {
		let bg = Infinity;
		for (let x = 0; x < W; x++) bg = Math.min(bg, v[y * W + x]);
		for (let x = 0; x < W; x++)
			for (let d = -kx.r; d <= kx.r; d++)
				tmp[y * W + x] +=
					(x + d < 0 || x + d >= W ? bg : v[y * W + x + d]) *
					kx.k[d + kx.r];
	}
	for (let y = 0; y < H; y++) {
		let mean = 0;
		for (let x = 0; x < W; x++) {
			for (let d = -ky.r; d <= ky.r; d++)
				out[y * W + x] +=
					(y + d < 0 || y + d >= H ? 0 : tmp[(y + d) * W + x]) *
					ky.k[d + ky.r];
			mean += out[y * W + x] / W;
		}
		for (let x = 0; x < W; x++) out[y * W + x] -= mean;
	}
	return normalize(out);
}
/**
 * @typedef {Object} RefineOptions
 * @property {boolean} [broadBlur]
 * @property {import('./types.js').ProgressCallback} [onProgress]
 * @property {import('./types.js').CancellationCallback} [isCancelled]
 *
 * @param {import('./types.js').ScanImage} image
 * @param {import('./types.js').TitleRow[]} rough
 * @param {RefineOptions} [options]
 */
export async function refineFontMatches(image, rough, options) {
	const {
		broadBlur = false,
		onProgress = function () {},
		isCancelled = function () {
			return false;
		}
	} = options === undefined ? {} : options;

	const { cv } = await getCV(),
		font = await new FontFace(
			'OCRFitFont',
			'url(/ocr/models/fonts/beleren.woff)'
		).load();
	document.fonts.add(font);
	const canvas = document.createElement('canvas');
	canvas.width = image.width;
	canvas.height = image.height;
	canvas.getContext('2d').drawImage(image, 0, 0);
	const src = cv.imread(canvas),
		cache = new Map(),
		target = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, W, 0, W, H, 0, H]),
		results = [];
	function template(name) {
		if (cache.has(name)) return cache.get(name);
		const c = document.createElement('canvas'),
			ctx = c.getContext('2d', { willReadFrequently: true });
		ctx.font = '32px OCRFitFont';
		const m = ctx.measureText(name),
			a = Math.ceil(m.actualBoundingBoxAscent);
		c.width = Math.ceil(m.width);
		c.height = a + Math.ceil(m.actualBoundingBoxDescent);
		ctx.font = '32px OCRFitFont';
		ctx.fillStyle = 'white';
		ctx.fillRect(0, 0, c.width, c.height);
		ctx.fillStyle = 'black';
		ctx.fillText(name, 0, a);
		const normalized = document.createElement('canvas');
		normalized.width = W;
		normalized.height = H;
		normalized.getContext('2d').drawImage(c, 0, 0, W, H);
		const v = features(normalized);
		cache.set(name, v);
		return v;
	}
	try {
		for (const [position, r] of rough.entries()) {
			if (isCancelled()) throw Error('Cancelled');
			if (position % 20 === 0) {
				onProgress({
					phase: 'Refine printed-name matches',
					completed: position,
					total: rough.length
				});
				await new Promise((resolve) => setTimeout(resolve, 0));
			}
			if (
				!r.candidates[0] ||
				r.candidates[0].score < 0.32 ||
				!r.candidates.some(
					(c) =>
						c.name.replace(/[^a-z]/gi, '').length >= 8 &&
						!c.name.includes('_')
				)
			)
				continue;
			const source = cv.matFromArray(4, 1, cv.CV_32FC2, r.poly.flat()),
				M = cv.getPerspectiveTransform(source, target),
				out = new cv.Mat();
			cv.warpPerspective(
				src,
				out,
				M,
				new cv.Size(W, H),
				cv.INTER_LINEAR,
				cv.BORDER_REPLICATE
			);
			const c = document.createElement('canvas');
			cv.imshow(c, out);
			const query = normalize(features(c)),
				width = Math.hypot(
					r.poly[1][0] - r.poly[0][0],
					r.poly[1][1] - r.poly[0][1]
				),
				height = Math.hypot(
					r.poly[3][0] - r.poly[0][0],
					r.poly[3][1] - r.poly[0][1]
				),
				ratio = ((width / height) * H) / W;
			const candidates = r.candidates
				.map((candidate) => {
					let score = -1,
						blur;
					const raw = template(candidate.name);
					for (const sx of broadBlur
						? [0.25, 0.5, 0.8, 1.2, 1.6, 2, 2.5, 3]
						: [0.25, 0.5, 0.8, 1.2, 1.6, 2])
						for (const scale of broadBlur ? [0.6, 1, 1.6] : [1]) {
							const sy = Math.max(
									0.25,
									Math.min(
										broadBlur ? 6 : 4,
										sx * ratio * scale
									)
								),
								v = blurred(raw, sx, sy);
							let s = 0;
							for (let i = 0; i < D; i++) s += v[i] * query[i];
							if (s > score) {
								score = s;
								blur = [sx, sy];
							}
						}
					return {
						name: candidate.name,
						coarseScore: candidate.score,
						score,
						blur
					};
				})
				.sort((a, b) => b.score - a.score);
			results.push({ mode: r.mode, poly: r.poly, candidates });
			source.delete();
			M.delete();
			out.delete();
		}
		onProgress({
			phase: 'Refine printed-name matches',
			completed: rough.length,
			total: rough.length
		});
		return results;
	} finally {
		src.delete();
		target.delete();
	}
}

export { features, normalize, blurred };
