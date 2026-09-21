import { findTitleStrips } from './edge-titles.js';
export async function titleProposals(image) {
	const original = await findTitleStrips(image),
		extra = await findTitleStrips(image, {
			saturation: 65,
			value: 75,
			hueLow: 0,
			hueHigh: 40
		}),
		lines = [...original, ...extra];
	const lengths = original.map((l) => l.length).sort((a, b) => b - a),
		typical = lengths[Math.min(12, lengths.length - 1)] || 400,
		joined = [];
	for (let i = 0; i < lines.length; i++)
		for (let j = i + 1; j < lines.length; j++) {
			let a = lines[i],
				b = lines[j];
			if (a.x1 > b.x1) [a, b] = [b, a];
			const gap = b.x1 - a.x2;
			if (
				gap < 0 ||
				gap > typical * 0.4 ||
				Math.abs(a.angle - b.angle) > 0.1 ||
				Math.abs(b.y1 - (a.y1 + (b.x1 - a.x1) * Math.tan(a.angle))) >
					typical * 0.05 ||
				b.x2 - a.x1 > typical * 1.4
			)
				continue;
			const points = [
					[a.x1, a.y1],
					[a.x2, a.y2],
					[b.x1, b.y1],
					[b.x2, b.y2]
				],
				cx = points.reduce((s, p) => s + p[0] / 4, 0),
				cy = points.reduce((s, p) => s + p[1] / 4, 0);
			const slope =
					points.reduce((s, [x, y]) => s + (x - cx) * (y - cy), 0) /
					points.reduce((s, [x]) => s + (x - cx) ** 2, 0),
				angle = Math.atan(slope),
				y1 = cy + (a.x1 - cx) * slope,
				y2 = cy + (b.x2 - cx) * slope;
			joined.push({
				x1: a.x1,
				y1,
				x2: b.x2,
				y2,
				angle,
				length: Math.hypot(b.x2 - a.x1, y2 - y1)
			});
		}
	const kept = [];
	for (const l of [...original, ...joined, ...extra]) {
		if (
			kept.some(
				(p) =>
					Math.abs(l.x1 - p.x1) < 15 &&
					Math.abs(l.x2 - p.x2) < 15 &&
					Math.abs(l.y1 - p.y1) < 10 &&
					Math.abs(l.y2 - p.y2) < 10
			)
		)
			continue;
		kept.push(l);
	}
	return kept;
}
