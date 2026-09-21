// Mask refinement and edge color decontamination for protected subjects.

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
function smooth(lo: number, hi: number, n: number): number {
	const t = clamp((n - lo) / (hi - lo), 0, 1);
	return t * t * (3 - 2 * t);
}

/** Mean over a (2r+1)² window, clipped at the borders, using a float64 summed-area table. */
export function boxMean(input: Float32Array | Float64Array, width: number, height: number, radius: number): Float64Array {
	const stride = width + 1, table = new Float64Array(stride * (height + 1));
	for (let y = 0; y < height; y++) {
		let row = 0;
		for (let x = 0; x < width; x++) { row += input[y * width + x]; table[(y + 1) * stride + x + 1] = table[y * stride + x + 1] + row; }
	}
	const out = new Float64Array(width * height);
	for (let y = 0; y < height; y++) {
		const y0 = Math.max(0, y - radius), y1 = Math.min(height, y + radius + 1);
		for (let x = 0; x < width; x++) {
			const x0 = Math.max(0, x - radius), x1 = Math.min(width, x + radius + 1);
			out[y * width + x] = (table[y1 * stride + x1] - table[y0 * stride + x1] - table[y1 * stride + x0] + table[y0 * stride + x0]) / ((x1 - x0) * (y1 - y0));
		}
	}
	return out;
}

/**
 * Color guided filter (He, Sun & Tang, ECCV 2010, eq. 13–15): q = mean(a)·I + mean(b), with
 * a = (Σ + εU)⁻¹ cov(I, p) solved per window. `guide` is interleaved RGB in 0..1.
 */
export function guidedFilter(guide: Float32Array, input: Float32Array, width: number, height: number, radius: number, epsilon: number): Float32Array {
	const n = width * height;
	const channel = (fn: (p: number) => number) => { const a = new Float64Array(n); for (let p = 0; p < n; p++) a[p] = fn(p); return boxMean(a, width, height, radius); };
	const mr = channel((p) => guide[p * 3]), mg = channel((p) => guide[p * 3 + 1]), mb = channel((p) => guide[p * 3 + 2]);
	const mp = boxMean(input, width, height, radius);
	const rr = channel((p) => guide[p * 3] ** 2), rg = channel((p) => guide[p * 3] * guide[p * 3 + 1]), rb = channel((p) => guide[p * 3] * guide[p * 3 + 2]);
	const gg = channel((p) => guide[p * 3 + 1] ** 2), gb = channel((p) => guide[p * 3 + 1] * guide[p * 3 + 2]), bb = channel((p) => guide[p * 3 + 2] ** 2);
	const rp = channel((p) => guide[p * 3] * input[p]), gp = channel((p) => guide[p * 3 + 1] * input[p]), bp = channel((p) => guide[p * 3 + 2] * input[p]);
	const ar = new Float64Array(n), ag = new Float64Array(n), ab = new Float64Array(n), b = new Float64Array(n);
	for (let p = 0; p < n; p++) {
		const vrr = rr[p] - mr[p] * mr[p] + epsilon, vrg = rg[p] - mr[p] * mg[p], vrb = rb[p] - mr[p] * mb[p];
		const vgg = gg[p] - mg[p] * mg[p] + epsilon, vgb = gb[p] - mg[p] * mb[p], vbb = bb[p] - mb[p] * mb[p] + epsilon;
		const cr = rp[p] - mr[p] * mp[p], cg = gp[p] - mg[p] * mp[p], cb = bp[p] - mb[p] * mp[p];
		const i00 = vgg * vbb - vgb * vgb, i01 = vgb * vrb - vrg * vbb, i02 = vrg * vgb - vgg * vrb;
		const i11 = vrr * vbb - vrb * vrb, i12 = vrb * vrg - vrr * vgb, i22 = vrr * vgg - vrg * vrg;
		const det = vrr * i00 + vrg * i01 + vrb * i02;
		ar[p] = (i00 * cr + i01 * cg + i02 * cb) / det;
		ag[p] = (i01 * cr + i11 * cg + i12 * cb) / det;
		ab[p] = (i02 * cr + i12 * cg + i22 * cb) / det;
		b[p] = mp[p] - ar[p] * mr[p] - ag[p] * mg[p] - ab[p] * mb[p];
	}
	const mar = boxMean(ar, width, height, radius), mag = boxMean(ag, width, height, radius), mab = boxMean(ab, width, height, radius), mbb = boxMean(b, width, height, radius);
	const out = new Float32Array(n);
	for (let p = 0; p < n; p++) out[p] = mar[p] * guide[p * 3] + mag[p] * guide[p * 3 + 1] + mab[p] * guide[p * 3 + 2] + mbb[p];
	return out;
}

/**
 * Refines a binary segmentation into an alpha matte. The guided filter only decides alpha
 * inside a narrow band around the segmentation boundary (it cannot find the subject by
 * itself); everything else keeps the hard GrabCut label, which prevents a broad halo.
 */
export function refineMask(guide: Float32Array, binary: Float32Array, width: number, height: number, feather: number): Float32Array {
	const radius = Math.max(1, Math.round(feather));
	// Small ε lets strong guide edges (hair, horns, claws) carve alpha; flat areas stay smooth.
	const filtered = guidedFilter(guide, binary, width, height, radius, 1e-4);
	const coverage = boxMean(binary, width, height, radius);
	const alpha = new Float32Array(width * height);
	for (let p = 0; p < alpha.length; p++) {
		if (coverage[p] <= 0 || coverage[p] >= 1) { alpha[p] = binary[p]; continue; }
		// Contract faint tails so near-transparent pixels do not form a translucent fringe.
		alpha[p] = clamp((filtered[p] - 0.04) / 0.92, 0, 1);
	}
	return alpha;
}

type Plane = { data: Float32Array; weight: Float32Array; width: number; height: number };

function reduceWeighted(p: Plane): Plane {
	const width = Math.ceil(p.width / 2), height = Math.ceil(p.height / 2);
	const data = new Float32Array(width * height * 3), weight = new Float32Array(width * height);
	const kernel = [1, 2, 1];
	for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
		let w = 0, r = 0, g = 0, b = 0, total = 0;
		for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
			const sx = clamp(x * 2 + i, 0, p.width - 1), sy = clamp(y * 2 + j, 0, p.height - 1), k = kernel[i + 1] * kernel[j + 1];
			const s = sy * p.width + sx, sw = p.weight[s] * k;
			w += sw; total += k;
			r += p.data[s * 3] * sw; g += p.data[s * 3 + 1] * sw; b += p.data[s * 3 + 2] * sw;
		}
		const o = y * width + x;
		weight[o] = w / total;
		if (w > 0) { data[o * 3] = r / w; data[o * 3 + 1] = g / w; data[o * 3 + 2] = b / w; }
	}
	return { data, weight, width, height };
}

/**
 * Push–pull scattered-data interpolation (Gortler et al., "The Lumigraph", 1996). Pixels
 * with weight 1 are reproduced exactly; zero-weight holes are filled smoothly from the
 * nearest known colors at the coarsest scale that contains them.
 */
export function pushPull(color: Float32Array, weight: Float32Array, width: number, height: number): Float32Array {
	const levels: Plane[] = [{ data: color, weight, width, height }];
	while (levels[levels.length - 1].width > 1 || levels[levels.length - 1].height > 1) levels.push(reduceWeighted(levels[levels.length - 1]));
	let filled = levels[levels.length - 1].data;
	for (let l = levels.length - 2; l >= 0; l--) {
		const level = levels[l], coarse = levels[l + 1], out = new Float32Array(level.width * level.height * 3);
		for (let y = 0; y < level.height; y++) for (let x = 0; x < level.width; x++) {
			const sx = Math.min(x / 2, coarse.width - 1), sy = Math.min(y / 2, coarse.height - 1);
			const x0 = clamp(Math.floor(sx), 0, coarse.width - 1), y0 = clamp(Math.floor(sy), 0, coarse.height - 1);
			const x1 = Math.min(x0 + 1, coarse.width - 1), y1 = Math.min(y0 + 1, coarse.height - 1);
			const fx = clamp(sx - x0, 0, 1), fy = clamp(sy - y0, 0, 1);
			const p = y * level.width + x, w = Math.min(1, level.weight[p]);
			for (let ch = 0; ch < 3; ch++) {
				const up = (filled[(y0 * coarse.width + x0) * 3 + ch] * (1 - fx) + filled[(y0 * coarse.width + x1) * 3 + ch] * fx) * (1 - fy) +
					(filled[(y1 * coarse.width + x0) * 3 + ch] * (1 - fx) + filled[(y1 * coarse.width + x1) * 3 + ch] * fx) * fy;
				out[p * 3 + ch] = level.data[p * 3 + ch] * w + up * (1 - w);
			}
		}
		filled = out;
	}
	return filled;
}

export type DecontaminatedLayer = {
	/** Foreground color correction: F − C (linear RGB, zero where alpha is 0 or 1). */
	foregroundDelta: Float32Array;
	/** Estimated original background: B − C (linear RGB, zero wherever alpha is 0). */
	backgroundDelta: Float32Array;
};

/**
 * Edge color decontamination. Observed boundary colors are modelled by the compositing
 * equation C = αF + (1−α)B. B is estimated by push–pull filling from confidently
 * background pixels (α ≈ 0), then F = (C − (1−α)B)/α. The solution is constrained to the
 * color range spanned by C and the nearby confident foreground, preventing bright or dark
 * fringes and oversaturation; below α≈0.25 the unstable division is blended toward that
 * local foreground color, and α≈0 pixels are left untouched.
 */
export function decontaminate(color: Float32Array, alpha: Float32Array, width: number, height: number, strength: number): DecontaminatedLayer {
	const n = width * height;
	const bgWeight = new Float32Array(n), fgWeight = new Float32Array(n);
	for (let p = 0; p < n; p++) { bgWeight[p] = alpha[p] <= 0.02 ? 1 : 0; fgWeight[p] = alpha[p] >= 0.98 ? 1 : 0; }
	const background = pushPull(color, bgWeight, width, height);
	const foreground = pushPull(color, fgWeight, width, height);
	const foregroundDelta = new Float32Array(n * 3), backgroundDelta = new Float32Array(n * 3);
	const margin = 0.04;
	for (let p = 0; p < n; p++) {
		const a = alpha[p];
		if (a <= 0) continue;
		for (let ch = 0; ch < 3; ch++) backgroundDelta[p * 3 + ch] = background[p * 3 + ch] - color[p * 3 + ch];
		if (a >= 1) continue;
		const confidence = smooth(0.02, 0.25, a);
		for (let ch = 0; ch < 3; ch++) {
			const c = color[p * 3 + ch], local = foreground[p * 3 + ch];
			const solved = (c - (1 - a) * background[p * 3 + ch]) / Math.max(a, 1e-3);
			const bounded = clamp(solved, Math.max(0, Math.min(c, local) - margin), Math.min(1, Math.max(c, local) + margin));
			const estimate = local * (1 - confidence) + bounded * confidence;
			foregroundDelta[p * 3 + ch] = strength * (estimate - c);
		}
	}
	return { foregroundDelta, backgroundDelta };
}
