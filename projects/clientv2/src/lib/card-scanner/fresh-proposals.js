import { makeFontIndex, lookup } from './font-ocr.js';
import { titleProposals } from './title-proposals.js';
import { stripCanvas, tightInkCrops, lightTitleBand } from './edge-titles.js';
import { rectifyPlane } from './rectify-plane.js';
export async function freshProposals(
	image,
	names,
	{ onProgress = () => {}, isCancelled = () => false } = {}
) {
	const start = performance.now(),
		outputs = [],
		passes = [];
	for (const mode of ['light', 'ink', 'plane']) {
		const began = performance.now(),
			index = await makeFontIndex(
				names.filter((n) => !n.startsWith('A-')),
				mode === 'light' ? 0 : 1.3
			),
			plane = mode === 'plane' ? await rectifyPlane(image) : null,
			source = plane?.canvas || image,
			lines = await titleProposals(source);
		let count = 0;
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
				bands = await tightInkCrops(strip.canvas, { allowTall: true });
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
				const candidates = lookup(band.canvas, index),
					poly = [
						[0, 0],
						[band.canvas.width, 0],
						[band.canvas.width, band.canvas.height],
						[0, band.canvas.height]
					].map(([x, y]) =>
						strip.toImage(x + band.left, y + band.top)
					);
				outputs.push({
					mode,
					poly: plane
						? poly.map((p) => plane.toOriginal(...p))
						: poly,
					candidates
				});
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
		passes.push({
			mode,
			totalMs: performance.now() - began,
			outputs: outputs.filter((r) => r.mode === mode).length
		});
		console.log('Fresh proposals pass', JSON.stringify(passes.at(-1)));
	}
	return { outputs, totalMs: performance.now() - start, passes };
}
