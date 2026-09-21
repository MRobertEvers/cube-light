import { PaddleOCR } from '@paddleocr/paddleocr-js';
import { createWorker } from 'tesseract.js';
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
export const scanPhoto = async ({
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
	isCancelled = () => false
} = {}) => {
	const image = await createImageBitmap(await (await fetch(url)).blob());
	const began = performance.now();
	let worker;
	try {
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
						ortOptions: {
							backend: 'wasm',
							numThreads: 1,
							simd: true
						}
					});
		if (engine === 'tesseract')
			await worker.setParameters({ tessedit_pageseg_mode: '11' });
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
					poly: item.poly.map(([x, y]) => [
						x / scale + region.x,
						y / scale + region.y
					])
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
};
