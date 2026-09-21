import type { OcrResultItem } from '@paddleocr/paddleocr-js';

type OcrWorker = Awaited<ReturnType<typeof import('@paddleocr/paddleocr-js')['PaddleOCR']['create']>>;
let ocrWorkerPromise: Promise<OcrWorker> | null = null;

function getOcrWorker(): Promise<OcrWorker> {
	if (!ocrWorkerPromise) {
		ocrWorkerPromise = import('@paddleocr/paddleocr-js')
			.then((module) => {
				const { PaddleOCR } = module;
				return PaddleOCR.create({
					// The SDK transfers image input into its module worker and replies with OCR results.
					worker: true,
					textDetectionModelName: 'PP-OCRv5_mobile_det',
					textRecognitionModelName: 'PP-OCRv5_mobile_rec',
					ortOptions: { backend: 'wasm', numThreads: 1, simd: true }
				});
			})
			.catch((error) => { ocrWorkerPromise = null; throw error; });
	}
	return ocrWorkerPromise;
}

async function resetOcrWorker(): Promise<void> {
	const previous = ocrWorkerPromise;
	ocrWorkerPromise = null;
	try { await (await previous)?.dispose(); } catch { /* The worker may already have failed. */ }
}

export type ImageRegion = { x: number; y: number; width: number; height: number };
export type CardImageCandidate = {
	name: string;
	text: string;
	score: number;
	box: ImageRegion;
};
export type ScanProgress = {
	phase: 'loading' | 'scanning';
	completed: number;
	total: number;
	region: ImageRegion | null;
	candidates: CardImageCandidate[];
};

function tileStarts(length: number, size: number, step: number): number[] {
	if (length <= size + step / 4) return [0];
	const starts = [0];
	while (true) {
		const next = starts[starts.length - 1] + step;
		if (next + size >= length) {
			const final = length - size;
			if (final - starts[starts.length - 1] < step / 4) starts[starts.length - 1] = final;
			else starts.push(final);
			break;
		}
		starts.push(next);
	}
	return starts;
}

function getRegions(width: number, height: number): ImageRegion[] {
	const xs = tileStarts(width, 1000, 800);
	const ys = tileStarts(height, 900, 700);
	return ys.flatMap((y) =>
		xs.map((x) => ({
			x, y, width: xs.length === 1 ? width : Math.min(1000, width - x),
			height: ys.length === 1 ? height : Math.min(900, height - y)
		}))
	);
}

type MatcherReply =
	| { type: 'ready' }
	| { type: 'matched'; id: number; candidates: CardImageCandidate[] }
	| { type: 'error'; id?: number; message: string };

function createMatcher(names: string[]) {
	const worker = new Worker(new URL('./card-name-match.worker.ts', import.meta.url), { type: 'module' });
	let readyResolve: () => void;
	let readyReject: (error: Error) => void;
	const ready = new Promise<void>((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
	const pending = new Map<number, { resolve: (candidates: CardImageCandidate[]) => void; reject: (error: Error) => void }>();
	let nextId = 0;
	worker.onmessage = (event: MessageEvent<MatcherReply>) => {
		const reply = event.data;
		if (reply.type === 'ready') readyResolve();
		else if (reply.type === 'error') {
			const error = new Error(reply.message);
			if (reply.id === undefined) readyReject(error);
			else {
				pending.get(reply.id)?.reject(error);
				pending.delete(reply.id);
			}
		} else {
			pending.get(reply.id)?.resolve(reply.candidates);
			pending.delete(reply.id);
		}
	};
	worker.onerror = () => {
		const error = new Error('Card matching worker failed');
		readyReject(error);
		for (const request of pending.values()) request.reject(error);
		pending.clear();
	};
	worker.postMessage({ type: 'initialize', names });
	return {
		ready,
		match(items: OcrResultItem[], region: ImageRegion): Promise<CardImageCandidate[]> {
			const id = nextId++;
			return new Promise((resolve, reject) => {
				pending.set(id, { resolve, reject });
				worker.postMessage({ type: 'match', id, items, region });
			});
		},
		terminate() { worker.terminate(); }
	};
}

export async function scanCardImage(
	file: File,
	names: string[],
	onProgress: (progress: ScanProgress) => void,
	isCancelled: () => boolean
): Promise<{ candidates: CardImageCandidate[]; width: number; height: number }> {
	const image = await createImageBitmap(file);
	const regions = getRegions(image.width, image.height);
	let candidates: CardImageCandidate[] = [];
	onProgress({ phase: 'loading', completed: 0, total: regions.length, region: null, candidates });
	const matcher = createMatcher(names);
	try {
		if (isCancelled()) return { candidates, width: image.width, height: image.height };
		const ocr = await getOcrWorker();
		await matcher.ready;
		for (let index = 0; index < regions.length; index++) {
			if (isCancelled()) break;
			const region = regions[index];
			onProgress({ phase: 'scanning', completed: index, total: regions.length, region, candidates: [...candidates] });
			await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
			const canvas = document.createElement('canvas');
			canvas.width = region.width;
			canvas.height = region.height;
			canvas.getContext('2d')?.drawImage(image, region.x, region.y, region.width, region.height,
				0, 0, region.width, region.height);
			const [result] = await ocr.predict(canvas);
			candidates = await matcher.match(result.items, region);
			onProgress({ phase: 'scanning', completed: index + 1, total: regions.length, region,
				candidates: [...candidates] });
		}
		return { candidates, width: image.width, height: image.height };
	} catch (error) {
		await resetOcrWorker();
		throw error;
	} finally {
		matcher.terminate();
		image.close();
	}
}
