import { getCV, tightInkCrops } from './edge-titles.js';
import { features, normalize, blurred } from './refine-font.js';
export async function scanReferenceTitles({
	image: suppliedImage,
	rows: suppliedRows,
	onProgress = () => {},
	isCancelled = () => false
} = {}) {
	const start = performance.now(),
		allReferences = await (
			await fetch('/ocr/models/title-references/' + 'catalog.json')
		).json(),
		needed = suppliedRows
			? new Set(suppliedRows.flatMap((r) => r.seeds.slice(0, 8)))
			: null,
		manifest = needed
			? allReferences.filter((r) => needed.has(r.name))
			: allReferences,
		{ cv } = await getCV(),
		templates = new Map();
	for (const ref of manifest) {
		if (isCancelled()) throw Error('Cancelled');
		let response = await fetch('/ocr/models/title-references/' + ref.file);
		if (
			!response.ok ||
			!response.headers.get('content-type')?.startsWith('image/')
		)
			response = await fetch(
				`https://cards.scryfall.io/normal/front/${ref.id[0]}/${ref.id[1]}/${ref.id}.jpg`
			);
		if (!response.ok) continue;
		const bitmap = await createImageBitmap(await response.blob()),
			band = document.createElement('canvas');
		band.width = Math.round(bitmap.width * 0.77);
		band.height = Math.round(bitmap.height * 0.065);
		const ctx = band.getContext('2d');
		ctx.drawImage(
			bitmap,
			bitmap.width * 0.06,
			bitmap.height * 0.032,
			bitmap.width * 0.77,
			bitmap.height * 0.065,
			0,
			0,
			band.width,
			band.height
		);
		let detected = band;
		if (ref.frame === '1997' || ref.frame === '1993') {
			detected = document.createElement('canvas');
			detected.width = band.width;
			detected.height = band.height;
			const dc = detected.getContext('2d');
			dc.filter = 'invert(1)';
			dc.drawImage(band, 0, 0);
		}
		const crops = await tightInkCrops(detected, { allowTall: true });
		for (const crop of crops.slice(0, 2)) {
			if (crop.canvas.width < ref.name.replace(/\s/g, '').length * 3)
				continue;
			const c = document.createElement('canvas');
			c.width = 96;
			c.height = 16;
			c.getContext('2d').drawImage(
				band,
				crop.left,
				crop.top,
				crop.canvas.width,
				crop.canvas.height,
				0,
				0,
				96,
				16
			);
			if (!templates.has(ref.name)) templates.set(ref.name, []);
			templates.get(ref.name).push({
				vector: features(c),
				frame: ref.frame,
				id: ref.id,
				box: [
					crop.left,
					crop.top,
					crop.canvas.width,
					crop.canvas.height
				]
			});
		}
		bitmap.close();
		onProgress({
			phase: 'Load printed titles',
			completed: manifest.indexOf(ref) + 1,
			total: manifest.length
		});
	}
	console.log('Reference templates ready', templates.size);
	const loadMs = performance.now() - start,
		image = suppliedImage,
		full = document.createElement('canvas');
	full.width = image.width;
	full.height = image.height;
	full.getContext('2d').drawImage(image, 0, 0);
	const src = cv.imread(full),
		target = cv.matFromArray(
			4,
			1,
			cv.CV_32FC2,
			[0, 0, 96, 0, 96, 16, 0, 16]
		),
		rows = suppliedRows,
		outputs = [];
	try {
		for (const row of rows) {
			if (isCancelled()) throw Error('Cancelled');
			const from = cv.matFromArray(4, 1, cv.CV_32FC2, row.poly.flat()),
				M = cv.getPerspectiveTransform(from, target),
				out = new cv.Mat();
			cv.warpPerspective(
				src,
				out,
				M,
				new cv.Size(96, 16),
				cv.INTER_LINEAR,
				cv.BORDER_REPLICATE
			);
			const c = document.createElement('canvas');
			cv.imshow(c, out);
			const query = normalize(features(c)),
				width = Math.hypot(
					row.poly[1][0] - row.poly[0][0],
					row.poly[1][1] - row.poly[0][1]
				),
				height = Math.hypot(
					row.poly[3][0] - row.poly[0][0],
					row.poly[3][1] - row.poly[0][1]
				),
				ratio = width / height / 6,
				candidates = [];
			for (const name of row.seeds.slice(0, 8)) {
				let score = -1,
					source,
					blur;
				for (const template of templates.get(name) || [])
					for (const sx of [0.25, 0.5, 0.8, 1.2, 1.6, 2]) {
						const sy = Math.max(0.25, Math.min(4, sx * ratio)),
							v = blurred(template.vector, sx, sy);
						let s = 0;
						for (let i = 0; i < 1536; i++) s += v[i] * query[i];
						if (s > score) {
							score = s;
							source = {
								id: template.id,
								frame: template.frame,
								box: template.box
							};
							blur = [sx, sy];
						}
					}
				if (source) candidates.push({ name, score, source, blur });
			}
			candidates.sort((a, b) => b.score - a.score);
			outputs.push({ poly: row.poly, candidates });
			console.log(
				'Reference',
				outputs.length,
				JSON.stringify(candidates.slice(0, 2))
			);
			for (const m of [from, M, out]) m.delete();
		}
		return {
			engine: 'printed-reference-title-matching',
			totalMs: performance.now() - start,
			loadMs,
			referenceCount: manifest.length,
			usesCachedProposals: true,
			outputs
		};
	} finally {
		src.delete();
		target.delete();
		if (!suppliedImage) image.close();
	}
}
