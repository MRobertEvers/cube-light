import type { BannerProtection } from '../../domain/appearance/banner-blend';
import type { BannerWasm, SubjectLayer, SubjectStage } from '../wasm/banner-wasm';

/** Largest working-image side for GrabCut; edges are recovered at full resolution afterwards. */
export const SEGMENTATION_SIZE = 280;
export const GRABCUT_ITERATIONS = 5;
export const GC_BGD = 0,
	GC_FGD = 1,
	GC_PR_BGD = 2,
	GC_PR_FGD = 3;

/**
 * Rasterises the rectangle and correction strokes into GrabCut labels at a given size.
 * Uses only + − × ÷, floor/ceil and sqrt, which are exact in every JS engine, so the labels
 * (and therefore the WASM result) are identical across browsers.
 */
export function protectionLabels(
	protection: BannerProtection,
	width: number,
	height: number
): Uint8Array {
	const { rect } = protection;
	const labels = new Uint8Array(width * height);
	if (rect) {
		labels.fill(GC_BGD);
		const x0 = Math.floor(rect.x * width),
			y0 = Math.floor(rect.y * height);
		const x1 = Math.ceil((rect.x + rect.width) * width),
			y1 = Math.ceil((rect.y + rect.height) * height);
		for (let y = Math.max(0, y0); y < Math.min(height, y1); y++)
			for (let x = Math.max(0, x0); x < Math.min(width, x1); x++)
				labels[y * width + x] = GC_PR_FGD;
	} else labels.fill(GC_PR_BGD);
	for (const stroke of protection.strokes) {
		const value = stroke.label === 'foreground' ? GC_FGD : GC_BGD;
		const radius = Math.max(0.75, stroke.radius * width);
		function disc(cx: number, cy: number) {
			for (
				let y = Math.max(0, Math.floor(cy - radius));
				y <= Math.min(height - 1, Math.ceil(cy + radius));
				y++
			)
				for (
					let x = Math.max(0, Math.floor(cx - radius));
					x <= Math.min(width - 1, Math.ceil(cx + radius));
					x++
				)
					if (
						(x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <=
						radius * radius
					)
						labels[y * width + x] = value;
		}
		const points = stroke.points;
		for (let i = 0; i + 1 < points.length; i += 2) {
			const x = points[i] * width,
				y = points[i + 1] * height;
			if (i + 3 >= points.length) {
				disc(x, y);
				continue;
			}
			const nx = points[i + 2] * width,
				ny = points[i + 3] * height;
			const steps = Math.max(
				1,
				Math.ceil(
					Math.sqrt((nx - x) * (nx - x) + (ny - y) * (ny - y)) /
						Math.max(0.5, radius / 2)
				)
			);
			for (let s = 0; s < steps; s++)
				disc(x + ((nx - x) * s) / steps, y + ((ny - y) * s) / steps);
		}
	}
	return labels;
}

export type SubjectOptions = {
	feather: number;
	decontamination: number;
	onStage?: (stage: SubjectStage) => void;
};

/**
 * segmentation → guided mask refinement → edge color decontamination (in WASM), all in
 * source-image coordinates. Deterministic for identical RGBA input, protection, and options.
 */
export function computeSubjectLayer(
	wasm: BannerWasm,
	rgba: Uint8ClampedArray,
	width: number,
	height: number,
	protection: BannerProtection,
	options: SubjectOptions
): SubjectLayer {
	const scale = Math.min(1, SEGMENTATION_SIZE / Math.max(width, height));
	const workWidth = Math.max(8, Math.round(width * scale)),
		workHeight = Math.max(8, Math.round(height * scale));
	const workLabels = protectionLabels(protection, workWidth, workHeight);
	// Full-resolution correction strokes are hard constraints the refinement must not undo.
	const fullLabels = protection.strokes.length
		? protectionLabels({ ...protection, rect: null }, width, height)
		: null;
	wasm.onStage = options.onStage ?? null;
	try {
		return wasm.subject(
			rgba,
			width,
			height,
			workLabels,
			workWidth,
			workHeight,
			fullLabels,
			GRABCUT_ITERATIONS,
			options.feather,
			options.decontamination
		);
	} finally {
		wasm.onStage = null;
	}
}
