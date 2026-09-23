import { createTitleIndex } from './font-ocr.js';
import { titleProposals } from './title-proposals.js';
import { stripCanvas, tightInkCrops, lightTitleBand } from './edge-titles.js';
import { rectifyPlane } from './rectify-plane.js';
/**
 * @param {import('./types.js').ScanImage} image
 * @param {string[]} names
 * @param {import('./types.js').ScanCallbacks} [options]
 */
export async function freshProposals(image, names, options) {
	const {
		onProgress = function () {},
		isCancelled = function () {
			return false;
		}
	} = options === undefined ? {} : options;

	const start = performance.now(),
		physicalNames = names.filter((n) => !n.startsWith('A-')),
		outputs = [],
		passes = [];
	// Ink and plane passes share one blurred index; light and ink share the image's lines.
	let index = null,
		indexBlur,
		imageLines = null;
	try {
		for (const mode of ['light', 'ink', 'plane']) {
			const began = performance.now(),
				blur = mode === 'light' ? 0 : 1.3;
			if (!index || indexBlur !== blur) {
				index?.dispose();
				index = null;
				onProgress({
					phase: 'Build title index: ' + mode,
					completed: 0,
					total: physicalNames.length
				});
				index = await createTitleIndex(
					physicalNames,
					blur,
					'beleren.woff',
					(e) =>
						onProgress({
							...e,
							phase: 'Build title index: ' + mode
						})
				);
				indexBlur = blur;
			}
			const plane =
					mode === 'plane'
						? await (async function () {
								onProgress({
									phase: 'Straighten card plane',
									completed: 0,
									total: 0
								});
								const result = await rectifyPlane(image);
								onProgress({
									phase: 'Straighten card plane',
									completed: 1,
									total: 1
								});
								return result;
							})()
						: null,
				source = plane?.canvas || image,
				lines = plane
					? await titleProposals(source)
					: (imageLines ||= await titleProposals(source));
			onProgress({
				phase: 'Title proposals: ' + mode,
				completed: 0,
				total: lines.length
			});
			let count = 0;
			const lookups = [];
			for (const line of lines) {
				if (isCancelled()) throw Error('Cancelled');
				const strip = stripCanvas(source, line, {
					offset: -0.04,
					height: 0.24,
					padding: 0,
					right: 0
				});
				let bands = [];
				if (mode === 'light')
					for (const light of lightTitleBand(strip.canvas))
						bands.push(
							...(await tightInkCrops(light.canvas)).map((b) => ({
								...b,
								top: b.top + light.top
							}))
						);
				else {
					bands = await tightInkCrops(strip.canvas, {
						allowTall: true
					});
					for (const light of lightTitleBand(strip.canvas))
						bands.push(
							...(await tightInkCrops(light.canvas)).map((b) => ({
								...b,
								top: b.top + light.top
							}))
						);
				}
				for (const band of bands) {
					if (
						mode !== 'light' &&
						(band.canvas.width / band.canvas.height < 4 ||
							band.canvas.width < 90)
					)
						continue;
					const poly = [
						[0, 0],
						[band.canvas.width, 0],
						[band.canvas.width, band.canvas.height],
						[0, band.canvas.height]
					].map(
						/**
						 * @param {number[]} values
						 */
						(values) => {
							const [x, y] = values;
							return strip.toImage(x + band.left, y + band.top);
						}
					);
					lookups.push(
						index.lookup(band.canvas).then((candidates) => ({
							mode,
							poly: plane
								? poly.map((p) => plane.toOriginal(...p))
								: poly,
							candidates
						}))
					);
				}
				if (++count % 20 === 0) {
					onProgress({
						phase: 'Title proposals: ' + mode,
						completed: count,
						total: lines.length
					});
					await new Promise((r) => setTimeout(r, 0));
				}
			}
			outputs.push(...(await Promise.all(lookups)));
			onProgress({
				phase: 'Title proposals: ' + mode,
				completed: lines.length,
				total: lines.length
			});
			passes.push({
				mode,
				totalMs: performance.now() - began,
				outputs: outputs.filter((r) => r.mode === mode).length
			});
			console.log('Fresh proposals pass', JSON.stringify(passes.at(-1)));
		}
	} finally {
		index?.dispose();
	}
	return { outputs, totalMs: performance.now() - start, passes };
}
