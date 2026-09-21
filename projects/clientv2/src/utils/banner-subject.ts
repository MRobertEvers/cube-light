import type { BannerProtection } from './banner-blend';
import { GC_BGD, GC_FGD, GC_PR_BGD, GC_PR_FGD, grabCut } from './banner-grabcut';
import { decontaminate, refineMask } from './banner-matting';

/** Largest working-image side for GrabCut; edges are recovered at full resolution afterwards. */
export const SEGMENTATION_SIZE = 280;
export const GRABCUT_ITERATIONS = 5;

export type SubjectLayer = {
	width: number;
	height: number;
	alpha: Float32Array;
	/** F − C, linear RGB (see decontaminate). */
	foregroundDelta: Float32Array;
	/** B − C, linear RGB. */
	backgroundDelta: Float32Array;
};

export function linearFromSrgb(n: number): number { n /= 255; return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; }
const LINEAR = Float32Array.from({ length: 256 }, (_, i) => linearFromSrgb(i));

/** Rasterises the rectangle and correction strokes into GrabCut labels at the working size. */
export function protectionLabels(protection: BannerProtection, width: number, height: number): Uint8Array {
	const labels = new Uint8Array(width * height);
	const { rect } = protection;
	if (rect) {
		labels.fill(GC_BGD);
		const x0 = Math.floor(rect.x * width), y0 = Math.floor(rect.y * height);
		const x1 = Math.ceil((rect.x + rect.width) * width), y1 = Math.ceil((rect.y + rect.height) * height);
		for (let y = Math.max(0, y0); y < Math.min(height, y1); y++) for (let x = Math.max(0, x0); x < Math.min(width, x1); x++) labels[y * width + x] = GC_PR_FGD;
	} else labels.fill(GC_PR_BGD);
	for (const stroke of protection.strokes) {
		const value = stroke.label === 'foreground' ? GC_FGD : GC_BGD;
		const radius = Math.max(0.75, stroke.radius * width);
		const disc = (cx: number, cy: number) => {
			for (let y = Math.max(0, Math.floor(cy - radius)); y <= Math.min(height - 1, Math.ceil(cy + radius)); y++)
				for (let x = Math.max(0, Math.floor(cx - radius)); x <= Math.min(width - 1, Math.ceil(cx + radius)); x++)
					if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= radius * radius) labels[y * width + x] = value;
		};
		const points = stroke.points;
		for (let i = 0; i + 1 < points.length; i += 2) {
			const x = points[i] * width, y = points[i + 1] * height;
			if (i + 3 >= points.length) { disc(x, y); continue; }
			const nx = points[i + 2] * width, ny = points[i + 3] * height;
			const steps = Math.max(1, Math.ceil(Math.hypot(nx - x, ny - y) / Math.max(0.5, radius / 2)));
			for (let s = 0; s < steps; s++) disc(x + (nx - x) * s / steps, y + (ny - y) * s / steps);
		}
	}
	return labels;
}

/** Area-averaged downsample of 8-bit RGBA to interleaved 0..255 RGB. */
function downsample(rgba: Uint8ClampedArray, width: number, height: number, targetWidth: number, targetHeight: number): Float64Array {
	const out = new Float64Array(targetWidth * targetHeight * 3);
	for (let ty = 0; ty < targetHeight; ty++) for (let tx = 0; tx < targetWidth; tx++) {
		const x0 = Math.floor(tx * width / targetWidth), x1 = Math.max(x0 + 1, Math.floor((tx + 1) * width / targetWidth));
		const y0 = Math.floor(ty * height / targetHeight), y1 = Math.max(y0 + 1, Math.floor((ty + 1) * height / targetHeight));
		let r = 0, g = 0, b = 0;
		for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const p = (y * width + x) * 4; r += rgba[p]; g += rgba[p + 1]; b += rgba[p + 2]; }
		const count = (x1 - x0) * (y1 - y0), o = (ty * targetWidth + tx) * 3;
		out[o] = r / count; out[o + 1] = g / count; out[o + 2] = b / count;
	}
	return out;
}

/** Nearest-label lookup of the working-size segmentation at full resolution, with bilinear smoothing before the 0.5 threshold. */
function upsampleBinary(labels: Uint8Array, width: number, height: number, targetWidth: number, targetHeight: number): Float32Array {
	const out = new Float32Array(targetWidth * targetHeight);
	const fg = (x: number, y: number) => (labels[y * width + x] === GC_FGD || labels[y * width + x] === GC_PR_FGD ? 1 : 0);
	for (let y = 0; y < targetHeight; y++) for (let x = 0; x < targetWidth; x++) {
		const sx = Math.max(0, Math.min(width - 1, (x + 0.5) * width / targetWidth - 0.5));
		const sy = Math.max(0, Math.min(height - 1, (y + 0.5) * height / targetHeight - 0.5));
		const x0 = Math.floor(sx), y0 = Math.floor(sy), x1 = Math.min(width - 1, x0 + 1), y1 = Math.min(height - 1, y0 + 1);
		const fx = sx - x0, fy = sy - y0;
		const value = (fg(x0, y0) * (1 - fx) + fg(x1, y0) * fx) * (1 - fy) + (fg(x0, y1) * (1 - fx) + fg(x1, y1) * fx) * fy;
		out[y * targetWidth + x] = value >= 0.5 ? 1 : 0;
	}
	return out;
}

export type SubjectOptions = { feather: number; decontamination: number; onStage?: (stage: 'segment' | 'refine' | 'decontaminate') => void };

/**
 * segmentation → guided mask refinement → edge color decontamination, all in source-image
 * coordinates. Deterministic for identical RGBA input, protection, and options.
 */
export function computeSubjectLayer(rgba: Uint8ClampedArray, width: number, height: number, protection: BannerProtection, options: SubjectOptions): SubjectLayer {
	const scale = Math.min(1, SEGMENTATION_SIZE / Math.max(width, height));
	const workWidth = Math.max(8, Math.round(width * scale)), workHeight = Math.max(8, Math.round(height * scale));
	options.onStage?.('segment');
	const labels = protectionLabels(protection, workWidth, workHeight);
	grabCut(downsample(rgba, width, height, workWidth, workHeight), workWidth, workHeight, labels, GRABCUT_ITERATIONS);

	options.onStage?.('refine');
	const binary = upsampleBinary(labels, workWidth, workHeight, width, height);
	// Full-resolution correction strokes are hard constraints the refinement must not undo.
	const fullLabels = protection.strokes.length ? protectionLabels({ ...protection, rect: null }, width, height) : null;
	const guide = new Float32Array(width * height * 3), color = new Float32Array(width * height * 3);
	for (let p = 0; p < width * height; p++) for (let ch = 0; ch < 3; ch++) {
		guide[p * 3 + ch] = rgba[p * 4 + ch] / 255;
		color[p * 3 + ch] = LINEAR[rgba[p * 4 + ch]];
	}
	const alpha = refineMask(guide, binary, width, height, options.feather);
	if (fullLabels) for (let p = 0; p < alpha.length; p++) {
		if (fullLabels[p] === GC_FGD) alpha[p] = 1; else if (fullLabels[p] === GC_BGD) alpha[p] = 0;
	}

	options.onStage?.('decontaminate');
	const { foregroundDelta, backgroundDelta } = decontaminate(color, alpha, width, height, options.decontamination);
	return { width, height, alpha, foregroundDelta, backgroundDelta };
}
