import { buildTokenCatalog, constrainedNameSearch } from './catalog-logits.js';
import {
	GlmOcrForConditionalGeneration,
	AutoProcessor,
	RawImage,
	env
} from 'transformers-v4';
import { getCV } from './edge-titles.js';
env.allowLocalModels = true;
env.allowRemoteModels = false;
env.localModelPath = '/ocr/models/';
env.useBrowserCache = false;
env.backends.onnx.wasm.numThreads = 1;
export async function readCatalogRegions(
	image,
	rows,
	names,
	{ onProgress = () => {}, isCancelled = () => false } = {}
) {
	const started = performance.now(),
		model = await GlmOcrForConditionalGeneration.from_pretrained('glm', {
			device: 'webgpu',
			dtype: 'fp16'
		}),
		processor = await AutoProcessor.from_pretrained('glm'),
		catalog = buildTokenCatalog(
			processor.tokenizer,
			names,
			model.generation_config.eos_token_id
		),
		{ cv } = await getCV(),
		full = document.createElement('canvas');
	full.width = image.width;
	full.height = image.height;
	full.getContext('2d').drawImage(image, 0, 0);
	const src = cv.imread(full),
		outputs = [],
		loadMs = performance.now() - started;
	const prompt = processor.apply_chat_template(
		[
			{
				role: 'user',
				content: [
					{ type: 'image' },
					{ type: 'text', text: 'Text Recognition:' }
				]
			}
		],
		{ add_generation_prompt: true }
	);
	try {
		const queue = [...rows];
		for (const row of queue) {
			if (isCancelled()) throw Error('Cancelled');
			const width = Math.max(
					32,
					Math.round(
						Math.hypot(
							row.poly[1][0] - row.poly[0][0],
							row.poly[1][1] - row.poly[0][1]
						) * 3
					)
				),
				height = Math.max(
					24,
					Math.round(
						Math.hypot(
							row.poly[3][0] - row.poly[0][0],
							row.poly[3][1] - row.poly[0][1]
						) * 3
					)
				),
				pad = 8,
				from = cv.matFromArray(4, 1, cv.CV_32FC2, row.poly.flat()),
				to = cv.matFromArray(4, 1, cv.CV_32FC2, [
					pad,
					pad,
					width + pad,
					pad,
					width + pad,
					height + pad,
					pad,
					height + pad
				]),
				M = cv.getPerspectiveTransform(from, to),
				out = new cv.Mat();
			cv.warpPerspective(
				src,
				out,
				M,
				new cv.Size(width + pad * 2, height + pad * 2),
				cv.INTER_CUBIC,
				cv.BORDER_REPLICATE
			);
			const c = document.createElement('canvas');
			cv.imshow(c, out);
			const inputs = await processor(prompt, RawImage.fromCanvas(c)),
				result = await constrainedNameSearch(model, inputs, catalog, {
					seeds: row.candidates.slice(0, 8).map((c) => c.name),
					maxAlternatives: 4
				});
			outputs.push({
				poly: row.poly,
				result,
				geometryVariant: !!row.geometryVariant
			});
			const best = result.ranked[0];
			if (
				row.variants?.length &&
				best?.name === row.candidates[0]?.name &&
				best.name.replace(/[^a-z]/gi, '').length >= 8 &&
				best.rawTokenSupport >= 0.03 &&
				result.searchGap < 0.3
			) {
				for (const poly of row.variants)
					queue.push({
						...row,
						poly,
						variants: undefined,
						geometryVariant: true
					});
			}
			onProgress({
				phase: 'Verify ambiguous names',
				completed: outputs.length,
				total: queue.length
			});
			console.log(
				'Verify',
				outputs.length,
				result.ranked[0]?.name,
				result.searchGap
			);
			for (const m of [from, to, M, out]) m.delete();
		}
		return {
			engine: 'glm-finite-catalog',
			totalMs: performance.now() - started,
			loadMs,
			outputs
		};
	} finally {
		src.delete();
		await model.dispose();
	}
}
