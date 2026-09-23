import type { OcrRecognizerRequest, OcrRecognizerResponse } from './card-ocr.protocol';

export type CardOcrOptions = { model: string; stretch: number; enhance: boolean; deblur: number; lexical: boolean };
export type CardOcrResult = Extract<OcrRecognizerResponse, { text: string }>;

type Waiting = { resolve: (response: OcrRecognizerResponse) => void; reject: (error: Error) => void };

/** The main-thread binding to CardOcrWorker: reads the text in one card region at a time. */
export class CardOcrWorkerClient {
	private readonly worker: Worker;
	private readonly options: CardOcrOptions;
	private readonly waiting = new Map<number, Waiting>();
	private nextId = 0;

	/** Starts a worker and waits for its model to load. */
	static async start(options: CardOcrOptions): Promise<CardOcrWorkerClient> {
		const client = new CardOcrWorkerClient(options);
		try {
			await client.call();
		} catch (error) {
			client.dispose();
			throw error;
		}
		return client;
	}

	private constructor(options: CardOcrOptions) {
		this.options = options;
		this.worker = new Worker(new URL('./card-ocr.worker.ts', import.meta.url), { type: 'module' });
		this.worker.onmessage = (event: MessageEvent<OcrRecognizerResponse>) => {
			const response = event.data;
			const waiting = this.waiting.get(response.id);
			this.waiting.delete(response.id);
			if ('error' in response) waiting?.reject(new Error(response.error));
			else waiting?.resolve(response);
		};
		this.worker.onerror = (event) => {
			for (const waiting of this.waiting.values()) waiting.reject(new Error(event.message || 'Recognition worker failed'));
			this.waiting.clear();
		};
	}

	/** Reads the text on the canvas, optionally scoring it against candidate card names. */
	async recognize(canvas: HTMLCanvasElement | OffscreenCanvas, candidateNames?: string[]): Promise<CardOcrResult> {
		const context = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
		const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
		return (await this.call(pixels, candidateNames)) as CardOcrResult;
	}

	dispose(): void {
		this.worker.terminate();
	}

	private call(pixels?: ImageData, candidateNames?: string[]): Promise<OcrRecognizerResponse> {
		const id = this.nextId++;
		return new Promise((resolve, reject) => {
			this.waiting.set(id, { resolve, reject });
			const request: OcrRecognizerRequest = { id, pixels, ...this.options, candidateNames };
			this.worker.postMessage(request, pixels ? [pixels.data.buffer] : []);
		});
	}
}
