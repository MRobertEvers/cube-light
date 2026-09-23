import { PaddleOCR } from '@paddleocr/paddleocr-js';
import { createWorker } from 'tesseract.js';
/**
 * @param {number} length
 * @param {number} size
 * @param {number} overlap
 */
export function tileStarts(length, size, overlap) {
	if (
		!Number.isFinite(length) ||
		length <= 0 ||
		!Number.isFinite(size) ||
		size <= 0 ||
		!Number.isFinite(overlap) ||
		overlap < 0 ||
		overlap >= size
	)
		throw new Error('Invalid tile geometry');
	if (length <= size) return [0];
	const out = [];
	for (let p = 0; p < length - size; p += size - overlap) out.push(p);
	out.push(length - size);
	return [...new Set(out)];
}
/**
 * @typedef {Object} PhotoScanOptions
 * @property {string} url
 * @property {'paddle'|'tesseract'} [engine]
 * @property {string} [model]
 * @property {string} [detector]
 * @property {number} [tileSize]
 * @property {number} [overlap]
 * @property {number} [scale]
 * @property {number} [detThresh]
 * @property {number} [boxThresh]
 * @property {import('./types.js').ProgressCallback} [onProgress]
 * @property {import('./types.js').CancellationCallback} [isCancelled]
 *
 * @param {PhotoScanOptions} [options]
 */
export async function scanPhoto(options) {
	const {
		url,
		engine = 'paddle',
		model = 'PP-OCRv6_small_rec',
		detector = 'PP-OCRv5_mobile_det',
		tileSize = 1400,
		overlap = 300,
		scale = 1,
		detThresh = 0.3,
		boxThresh = 0.6,
		onProgress,
		isCancelled = function () {
			return false;
		}
	} = options === undefined ? {} : options;

	const image = await createImageBitmap(await (await fetch(url)).blob());
	const began = performance.now();
	let worker;
	try {
		onProgress?.({
			phase: 'Prepare text reader',
			completed: 0,
			total: 0
		});
		worker =
			engine === 'tesseract'
				? await createWorker('eng')
				: await PaddleOCR.create({
						worker: true,
						textDetectionModelName: detector,
						textRecognitionModelName: model,
						textDetectionModelAsset: {
							url: new URL(
								`/ocr/models/paddle/${detector}.tar`,
								location.origin
							).href
						},
						textRecognitionModelAsset: {
							url: new URL(
								`/ocr/models/paddle/${model}.tar`,
								location.origin
							).href
						},
						// WebGPU when the device has it, otherwise WASM.
						ortOptions: {
							backend: 'auto',
							numThreads: 1,
							simd: true
						}
					});
		if (engine === 'tesseract')
			await worker.setParameters({ tessedit_pageseg_mode: '11' });
		onProgress?.({
			phase: 'Prepare text reader',
			completed: 1,
			total: 1
		});
		const loadMs = performance.now() - began;
		const regions = tileStarts(image.height, tileSize, overlap).flatMap(
			(y) =>
				tileStarts(image.width, tileSize, overlap).map((x) => ({
					x,
					y,
					w: Math.min(tileSize, image.width),
					h: Math.min(tileSize, image.height)
				}))
		);
		const outputs = [];
		onProgress?.({
			phase: 'Read visible titles',
			completed: 0,
			total: regions.length
		});
		for (const region of regions) {
			if (isCancelled()) break;
			const canvas = document.createElement('canvas');
			canvas.width = region.w * scale;
			canvas.height = region.h * scale;
			canvas
				.getContext('2d')
				.drawImage(
					image,
					region.x,
					region.y,
					region.w,
					region.h,
					0,
					0,
					canvas.width,
					canvas.height
				);
			const t = performance.now();
			let items;
			if (engine === 'tesseract') {
				const { data } = await worker.recognize(
					canvas,
					{},
					{ blocks: true, text: true }
				);
				items = (data.blocks || [])
					.flatMap((b) => b.paragraphs.flatMap((p) => p.lines))
					.map((l) => ({
						text: l.text.trim(),
						score: l.confidence / 100,
						poly: [
							[l.bbox.x0, l.bbox.y0],
							[l.bbox.x1, l.bbox.y0],
							[l.bbox.x1, l.bbox.y1],
							[l.bbox.x0, l.bbox.y1]
						]
					}));
			} else
				items = (
					await worker.predict(canvas, {
						textDetLimitSideLen: 960,
						textDetLimitType: 'max',
						textRecScoreThresh: 0.3,
						textDetThresh: detThresh,
						textDetBoxThresh: boxThresh
					})
				)[0].items;
			outputs.push({
				region,
				ms: performance.now() - t,
				items: items.map((item) => ({
					...item,
					poly: item.poly.map(
						/**
						 * @param {number[]} values
						 */
						(values) => {
							const [x, y] = values;
							return [x / scale + region.x, y / scale + region.y];
						}
					)
				}))
			});
			const message = `${engine}: tile ${outputs.length}/${regions.length}`;
			if (document.getElementById('status'))
				document.getElementById('status').textContent = message;
			console.log(message);
			onProgress?.({
				completed: outputs.length,
				total: regions.length,
				region
			});
		}
		return {
			engine,
			model,
			detector,
			tileSize,
			overlap,
			scale,
			detThresh,
			boxThresh,
			width: image.width,
			height: image.height,
			loadMs,
			totalMs: performance.now() - began,
			outputs
		};
	} finally {
		image.close();
		await worker?.dispose?.();
		await worker?.terminate?.();
	}
}
