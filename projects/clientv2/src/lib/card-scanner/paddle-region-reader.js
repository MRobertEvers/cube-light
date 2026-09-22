import { getCV } from './edge-titles.js';
import { createRecognizer } from './direct-recognizer.js';
export async function readPaddleRegions(
	image,
	rows,
	names,
	{ onProgress = () => {}, isCancelled = () => false } = {}
) {
	const started = performance.now(),
		reader = await createRecognizer('medium', 1, false, 0, true),
		{ cv } = await getCV(),
		full = document.createElement('canvas');
	full.width = image.width;
	full.height = image.height;
	full.getContext('2d').drawImage(image, 0, 0);
	const src = cv.imread(full),
		outputs = [],
		queue = [...rows],
		loadMs = performance.now() - started;
	try {
		for (const row of queue) {
			if (isCancelled()) throw Error('Cancelled');
			const w = Math.max(
					32,
					Math.round(
						Math.hypot(
							row.poly[1][0] - row.poly[0][0],
							row.poly[1][1] - row.poly[0][1]
						) * 3
					)
				),
				h = Math.max(
					24,
					Math.round(
						Math.hypot(
							row.poly[3][0] - row.poly[0][0],
							row.poly[3][1] - row.poly[0][1]
						) * 3
					)
				),
				p = 8,
				from = cv.matFromArray(4, 1, cv.CV_32FC2, row.poly.flat()),
				to = cv.matFromArray(4, 1, cv.CV_32FC2, [
					p,
					p,
					w + p,
					p,
					w + p,
					h + p,
					p,
					h + p
				]),
				M = cv.getPerspectiveTransform(from, to),
				out = new cv.Mat();
			cv.warpPerspective(
				src,
				out,
				M,
				new cv.Size(w + 2 * p, h + 2 * p),
				cv.INTER_CUBIC,
				cv.BORDER_REPLICATE
			);
			const c = document.createElement('canvas');
			cv.imshow(c, out);
			const prediction = await reader.recognize(
					c,
					row.candidates.slice(0, 8).map((c) => c.name)
				),
				ranked = prediction.lexical || [],
				searchGap =
					ranked.length > 1
						? ranked[0].meanLogProbability -
							ranked[1].meanLogProbability
						: 0,
				result = { ranked, searchGap };
			outputs.push({
				poly: row.poly,
				result,
				text: prediction.text,
				geometryVariant: !!row.geometryVariant
			});
			const best = ranked[0];
			if (
				row.variants?.length &&
				best?.name === row.candidates[0]?.name &&
				best.name.replace(/[^a-z]/gi, '').length >= 8 &&
				best.rawTokenSupport >= 0.03 &&
				searchGap < 0.3
			)
				for (const poly of row.variants)
					queue.push({
						...row,
						poly,
						variants: undefined,
						geometryVariant: true
					});
			onProgress({
				phase: 'Verify ambiguous names',
				completed: outputs.length,
				total: queue.length
			});
			console.log(
				'Paddle verify',
				outputs.length,
				prediction.text,
				best?.name,
				searchGap
			);
			for (const m of [from, to, M, out]) m.delete();
		}
		return {
			engine: 'paddle-medium-catalog-verifier',
			totalMs: performance.now() - started,
			loadMs,
			outputs
		};
	} finally {
		src.delete();
		reader.dispose();
	}
}
