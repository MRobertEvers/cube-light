import { scoreCTCNames } from './ctc-candidate-score.js';
import { makeLexicon, decodeLexicon } from './ctc-lexicon.js';
import { deblurImageData } from './deblur.js';
import * as ort from 'onnxruntime-web';
import yaml from 'js-yaml';
ort.env.wasm.numThreads = 1;
let session, dict, lexicon;
async function initialize(model) {
	const response = await fetch(
		`/ocr/models/paddle/${model === 'medium' ? 'medium-rec' : model === 'server' ? 'server-rec' : model === 'english' ? 'en-rec' : 'rec'}.yml`
	);
	if (!response.ok)
		throw new Error(
			'Missing OCR recognition assets; restore the Git-tracked model files and run npm run install:ocr'
		);
	const config = yaml.load(await response.text());
	dict = [...config.PostProcess.character_dict, ' '];
	session = await ort.InferenceSession.create(
		`/ocr/models/paddle/${model === 'medium' ? 'medium-rec' : model === 'server' ? 'server-rec' : model === 'english' ? 'en-rec' : 'rec'}.onnx`,
		{ executionProviders: ['wasm'] }
	);
}
self.onmessage = async ({
	data: {
		id,
		pixels,
		model,
		stretch = 1,
		enhance = false,
		deblur = 0,
		lexical = false,
		candidateNames
	}
}) => {
	try {
		if (!session) await initialize(model);
		if (!pixels) {
			self.postMessage({ id, ready: true });
			return;
		}
		if (deblur) deblurImageData(pixels, deblur);
		if (enhance) {
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
									(gray[i] +
										2 * (gray[i] - sum / count) -
										128) *
										1.5
							)
						);
					data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v;
				}
		}
		const original = new OffscreenCanvas(pixels.width, pixels.height);
		original.getContext('2d').putImageData(pixels, 0, 0);
		const h = 48,
			resizedW = Math.min(
				3200,
				Math.ceil((h * pixels.width) / pixels.height / stretch)
			),
			w = Math.max(320, resizedW);
		const canvas = new OffscreenCanvas(resizedW, h),
			ctx = canvas.getContext('2d');
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
			out = outputs[session.outputNames[0]];
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
				const p = out.data[t * classes + j];
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
		let hypotheses;
		if (lexical && (text.length >= 3 || candidateNames?.length)) {
			lexicon ||= makeLexicon(
				await (await fetch('/ocr/card-names.json')).json()
			);
			hypotheses = decodeLexicon(
				out.data,
				steps,
				['_', ...dict],
				lexicon,
				{ skip: 0, blankIndex: 0 }
			);
		}
		if (candidateNames?.length)
			hypotheses = scoreCTCNames(
				out.data,
				steps,
				['_', ...dict],
				[...candidateNames, ...(hypotheses || []).map((h) => h.name)],
				0
			);
		input.dispose();
		for (const output of Object.values(outputs)) output.dispose();
		self.postMessage({
			id,
			text,
			score: count ? sum / count : 0,
			lexical: hypotheses
		});
	} catch (error) {
		self.postMessage({ id, error: String(error) });
	}
};
