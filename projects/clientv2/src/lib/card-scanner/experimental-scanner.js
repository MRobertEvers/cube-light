import { scanPhoto } from './photo-scan.js';
import { freshProposals } from './fresh-proposals.js';
import { refineFontMatches } from './refine-font.js';
import { scanReferenceTitles } from './reference-titles.js';
import { addTextConsensus } from './consensus.js';
import { findTitleStrips } from './edge-titles.js';
import {
	buildIndex,
	matchDetections,
	bounds,
	sameLine
} from './photo-match.js';

export async function scanExperimental({
	url,
	names,
	onProgress = () => {},
	onStage = async () => {},
	isCancelled = () => false,
	useGLM = true,
	verifier = useGLM ? 'glm' : 'none'
} = {}) {
	if (!['glm', 'paddle-medium', 'none'].includes(verifier))
		throw Error('Unknown verifier');
	if (verifier === 'glm' && !navigator.gpu)
		throw Error(
			'The experimental verifier requires a browser with WebGPU.'
		);
	const started = performance.now();
	names ||= await (await fetch('/ocr/card-names.json')).json();
	const passes = [],
		index = buildIndex(names);
	const baseline = await scanPhoto({
		url,
		tileSize: 960,
		overlap: 200,
		detThresh: 0.1,
		boxThresh: 0.3,
		isCancelled,
		onProgress: (p) => onProgress({ ...p, phase: 'Read visible titles' })
	});
	passes.push(baseline);
	let candidates = matchDetections(baseline.outputs, index).filter(
		(c) => c.status === 'accepted'
	);
	await onStage('baseline', { candidates, pass: baseline });
	const image = await createImageBitmap(await (await fetch(url)).blob());
	try {
		const rough = await freshProposals(image, names, {
			onProgress,
			isCancelled
		});
		passes.push({ engine: 'font-proposals', ...rough });
		await onStage('proposals', rough);
		onProgress({ phase: 'Refine printed-name matches' });
		const refineStart = performance.now(),
			refined = await refineFontMatches(image, rough.outputs);
		passes.push({
			engine: 'font-refinement',
			totalMs: performance.now() - refineStart,
			outputs: refined
		});
		const add = (rows, minimum, gap, kind) => {
			for (const row of [...rows].sort(
				(a, b) =>
					(b.candidates[0]?.score || 0) -
					(a.candidates[0]?.score || 0)
			)) {
				const [a, b] = row.candidates;
				if (
					!a ||
					a.score < minimum ||
					a.score - (b?.score || 0) < gap ||
					a.name.includes('_') ||
					a.name.replace(/[^a-z]/gi, '').length < 8
				)
					continue;
				const box = bounds(row.poly);
				if (!candidates.some((c) => sameLine(c.box, box)))
					candidates.push({
						name: a.name,
						text: kind,
						status: 'accepted',
						poly: row.poly,
						box,
						score: a.score,
						margin: a.score - (b?.score || 0)
					});
			}
		};
		add(refined, 0.75, 0.12, 'Printed-name font fit');
		await onStage('font', { candidates, outputs: refined });
		const lines = await findTitleStrips(image),
			typical = [...lines].sort((a, b) => b.length - a.length)[
				Math.min(12, lines.length - 1)
			].length;
		const eligible = (row) => {
			const b = bounds(row.poly),
				cx = b.x + b.w / 2,
				cy = b.y + b.h / 2,
				angle = Math.atan2(
					row.poly[1][1] - row.poly[0][1],
					row.poly[1][0] - row.poly[0][0]
				);
			return (
				b.w >= 60 &&
				b.h >= 8 &&
				!candidates.some((c) => sameLine(c.box, b)) &&
				lines.some((l) => {
					const dx = cx - l.x1,
						dy = cy - l.y1,
						along = dx * Math.cos(l.angle) + dy * Math.sin(l.angle),
						down = -dx * Math.sin(l.angle) + dy * Math.cos(l.angle);
					return (
						along > -typical * 0.1 &&
						along < l.length + typical * 0.1 &&
						down > -5 &&
						down < typical * 0.2 &&
						Math.abs(angle - l.angle) < 0.15
					);
				})
			);
		};
		const distinct = (rows) => {
			const kept = [];
			for (const r of [...rows].sort(
				(a, b) => b.candidates[0].score - a.candidates[0].score
			)) {
				const box = bounds(r.poly);
				if (
					!kept.some((o) => {
						const b = bounds(o.poly);
						return (
							sameLine(b, box) &&
							Math.min(b.w, box.w) / Math.max(b.w, box.w) > 0.8 &&
							Math.min(b.h, box.h) / Math.max(b.h, box.h) > 0.7
						);
					})
				)
					kept.push(r);
			}
			return kept;
		};
		const referenceRows = distinct(
			refined.filter((r) => r.candidates[0].score >= 0.6 && eligible(r))
		).map((r) => ({ ...r, seeds: r.candidates.map((c) => c.name) }));
		console.log('Fresh reference queries', referenceRows.length);
		const references = await scanReferenceTitles({
			image,
			rows: referenceRows,
			onProgress,
			isCancelled
		});
		passes.push(references);
		add(references.outputs, 0.85, 0.15, 'Printed reference title');
		await onStage('references', { candidates, pass: references });
		const verificationRows =
			verifier !== 'none'
				? distinct(
						rough.outputs.filter(
							(r) => r.candidates[0].score >= 0.5 && eligible(r)
						)
					).slice(0, 60)
				: [];
		for (const row of verificationRows) {
			const box = bounds(row.poly),
				key = row.candidates[0].name;
			row.variants = rough.outputs
				.filter((other) => {
					const b = bounds(other.poly);
					return (
						other.candidates.some((c) => c.name === key) &&
						sameLine(box, b) &&
						Math.min(box.w, b.w) / Math.max(box.w, b.w) > 0.85 &&
						Math.min(box.h, b.h) / Math.max(box.h, b.h) > 0.7 &&
						JSON.stringify(other.poly) !== JSON.stringify(row.poly)
					);
				})
				.slice(0, 3)
				.map((other) => other.poly);
		}
		console.log('Verifier queries', verificationRows.length);
		if (verificationRows.length) {
			const readRegions =
				verifier === 'paddle-medium'
					? (await import('./paddle-region-reader.js'))
							.readPaddleRegions
					: (await import('./catalog-region-reader.js'))
							.readCatalogRegions;
			const verification = await readRegions(
				image,
				verificationRows,
				names,
				{
					onProgress,
					isCancelled
				}
			);
			passes.push(verification);
			candidates = addTextConsensus(
				candidates,
				verification.outputs,
				rough.outputs,
				verifier === 'paddle-medium' ? 'Paddle v6 medium' : 'GLM'
			);
			await onStage('verification', { candidates, pass: verification });
		}
		return {
			engine: 'experimental-text-only-' + verifier,
			verifier,
			useGLM: verifier === 'glm',
			names: [...new Set(candidates.map((c) => c.name))].sort(),
			candidates,
			passes,
			totalMs: performance.now() - started,
			cancelled: isCancelled(),
			usesCachedProposals: false
		};
	} finally {
		image.close();
	}
}
