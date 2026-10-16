import { CardOcrWorkerClient } from '../../workers/card-ocr/card-ocr.client';
import { countCrop, cropCount, needsCountRead } from './list-layout.js';

/**
 * Reads each deck-list line's count again from the spot beside its name.
 * Recognition alone on that small crop reads counts that text detection
 * misses or misplaces.
 * @param {import('./types.js').ScanImage} image
 * @param {import('./list-layout.js').LineCandidate[]} lines
 * @param {'left'|'right'} side
 * @param {import('./types.js').ScanCallbacks} [options]
 */
export async function readListCounts(image, lines, side, options) {
	const {
		onProgress = function () {},
		isCancelled = function () {
			return false;
		}
	} = options === undefined ? {} : options;

	const queue = lines.filter(needsCountRead);
	if (!queue.length) return { engine: 'list-counts', outputs: [] };
	onProgress({ phase: 'Read list counts', completed: 0, total: queue.length });
	const started = performance.now(),
		reader = await CardOcrWorkerClient.start({
			model: 'medium',
			stretch: 1,
			enhance: false,
			deblur: 0,
			lexical: false
		}),
		outputs = [];
	try {
		for (const line of queue) {
			if (isCancelled()) break;
			const crop = countCrop(line.box, side, image);
			if (crop) {
				const canvas = document.createElement('canvas');
				canvas.width = crop.w;
				canvas.height = crop.h;
				canvas
					.getContext('2d')
					.drawImage(image, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
				const read = await reader.recognize(canvas),
					count = read.score >= 0.5 ? cropCount(read.text) : null;
				// `side` is where this list keeps its counts, so a bare number there is one.
				if (count)
					line.count = {
						value: count.value,
						side,
						marked: count.marked,
						from: 'crop'
					};
				outputs.push({ crop, text: read.text, score: read.score });
			}
			onProgress({
				phase: 'Read list counts',
				completed: outputs.length,
				total: queue.length,
				region: crop
			});
		}
	} finally {
		reader.dispose();
	}
	return {
		engine: 'list-counts',
		totalMs: performance.now() - started,
		outputs
	};
}
