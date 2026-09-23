import * as ort from 'onnxruntime-web';
// @ts-expect-error js-yaml ships no type declarations
import yaml from 'js-yaml';
import { scoreCTCNames } from '../lib/card-scanner/ctc-candidate-score.js';
import { makeLexicon, decodeLexicon } from '../lib/card-scanner/ctc-lexicon.js';
import { deblurImageData } from '../lib/card-scanner/deblur.js';

/** Reads one title crop with a Paddle recognition model. A request without pixels only loads the model. */
export type OcrRecognizerRequest = {
	id: number;
	pixels?: ImageData;
	model: string;
	stretch?: number;
	enhance?: boolean;
	deblur?: number;
	lexical?: boolean;
	candidateNames?: string[];
};
export type OcrRecognizerResponse =
	| { id: number; error: string }
	| { id: number; ready: true }
	| { id: number; text: string; score: number; lexical?: object[] };

// Threads need SharedArrayBuffer, which only a cross-origin isolated page gets.
ort.env.wasm.numThreads = self.crossOriginIsolated
	? Math.min(4, navigator.hardwareConcurrency || 1)
	: 1;

let session: ort.InferenceSession | undefined;
let dict: string[];
let lexicon: ReturnType<typeof makeLexicon> | undefined;

function post(message: OcrRecognizerResponse) {
	(self as unknown as Worker).postMessage(message);
}

function modelFile(model: string) {
	if (model === 'medium') return 'medium-rec';
	if (model === 'server') return 'server-rec';
	if (model === 'english') return 'en-rec';
	return 'rec';
}

async function initialize(model: string) {
	const response = await fetch(`/ocr/models/paddle/${modelFile(model)}.yml`);
	if (!response.ok)
		throw new Error(
			'Missing OCR recognition assets; restore the Git-tracked model files and run npm run install:ocr'
		);
	const config = yaml.load(await response.text()) as {
		PostProcess: { character_dict: string[] };
	};
	dict = [...config.PostProcess.character_dict, ' '];
	session = await ort.InferenceSession.create(
		`/ocr/models/paddle/${modelFile(model)}.onnx`,
		{ executionProviders: navigator.gpu ? ['webgpu', 'wasm'] : ['wasm'] }
	);
}

function enhanceContrast(pixels: ImageData) {
	const { width: w, height: h, data } = pixels,
		gray = new Float32Array(w * h);
	for (let i = 0; i < gray.length; i++)
		gray[i] =
			0.299 * data[i * 4] +
			0.587 * data[i * 4 + 1] +
			0.114 * data[i * 4 + 2];
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) {
			let sum = 0,
				count = 0;
			for (let dy = -3; dy <= 3; dy++)
				for (let dx = -3; dx <= 3; dx++) {
					const xx = Math.max(0, Math.min(w - 1, x + dx)),
						yy = Math.max(0, Math.min(h - 1, y + dy));
					sum += gray[yy * w + xx];
					count++;
				}
			const i = y * w + x,
				v = Math.max(
					0,
					Math.min(
						255,
						128 +
							(gray[i] + 2 * (gray[i] - sum / count) - 128) * 1.5
					)
				);
			data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v;
		}
}

async function recognize(
	request: OcrRecognizerRequest & { pixels: ImageData }
) {
	const {
		id,
		pixels,
		stretch = 1,
		enhance = false,
		deblur = 0,
		lexical = false,
		candidateNames
	} = request;
	if (!session) throw new Error('Recognizer is not loaded');
	if (deblur) deblurImageData(pixels, deblur);
	if (enhance) enhanceContrast(pixels);
	const original = new OffscreenCanvas(pixels.width, pixels.height);
	original.getContext('2d')!.putImageData(pixels, 0, 0);
	const h = 48,
		resizedW = Math.min(
			3200,
			Math.ceil((h * pixels.width) / pixels.height / stretch)
		),
		w = Math.max(320, resizedW);
	const canvas = new OffscreenCanvas(resizedW, h),
		ctx = canvas.getContext('2d')!;
	ctx.drawImage(original, 0, 0, resizedW, h);
	const rgba = ctx.getImageData(0, 0, resizedW, h).data,
		chw = new Float32Array(3 * w * h);
	for (let y = 0; y < h; y++)
		for (let x = 0; x < resizedW; x++)
			for (let c = 0; c < 3; c++)
				chw[c * w * h + y * w + x] =
					rgba[(y * resizedW + x) * 4 + 2 - c] / 127.5 - 1;
	const input = new ort.Tensor('float32', chw, [1, 3, h, w]);
	const outputs = await session.run({ [session.inputNames[0]]: input }),
		out = outputs[session.outputNames[0]],
		data = out.data as Float32Array;
	let text = '',
		sum = 0,
		count = 0,
		prev = -1;
	const steps = out.dims[1],
		classes = out.dims[2];
	for (let t = 0; t < steps; t++) {
		let max = -Infinity,
			idx = 0;
		for (let j = 0; j < classes; j++) {
			const p = data[t * classes + j];
			if (p > max) {
				max = p;
				idx = j;
			}
		}
		if (idx > 0 && idx !== prev) {
			text += dict[idx - 1] || '';
			sum += max;
			count++;
		}
		prev = idx;
	}
	let hypotheses: { name: string }[] | undefined;
	if (lexical && (text.length >= 3 || candidateNames?.length)) {
		lexicon ||= makeLexicon(
			await (await fetch('/ocr/card-names.json')).json()
		);
		hypotheses = decodeLexicon(data, steps, ['_', ...dict], lexicon, {
			skip: 0,
			blankIndex: 0
		});
	}
	if (candidateNames?.length)
		hypotheses = scoreCTCNames(
			data,
			steps,
			['_', ...dict],
			[...candidateNames, ...(hypotheses || []).map((h) => h.name)],
			0
		);
	input.dispose();
	for (const output of Object.values(outputs)) output.dispose();
	post({
		id,
		text,
		score: count ? sum / count : 0,
		lexical: hypotheses
	});
}

async function handle(request: OcrRecognizerRequest) {
	try {
		if (!session) await initialize(request.model);
		if (!request.pixels) post({ id: request.id, ready: true });
		else await recognize({ ...request, pixels: request.pixels });
	} catch (error) {
		post({ id: request.id, error: String(error) });
	}
}

// Callers may queue several crops at once; one session runs one inference at a time.
let queue = Promise.resolve();
self.onmessage = function (event: MessageEvent<OcrRecognizerRequest>) {
	queue = queue.then(() => handle(event.data));
};
