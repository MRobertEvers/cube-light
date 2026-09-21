import type { BannerBlendConfig } from './banner-blend';

type Plane = { data: Float32Array; width: number; height: number; channels: number };
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
function smooth(lo: number, hi: number, n: number): number {
	const t = clamp((n - lo) / (hi - lo), 0, 1);
	return t * t * (3 - 2 * t);
}
function linear(n: number): number { n /= 255; return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; }
function srgb(n: number): number { n = clamp(n, 0, 1); return Math.round(255 * (n <= 0.0031308 ? n * 12.92 : 1.055 * n ** (1 / 2.4) - 0.055)); }
const LINEAR = Float32Array.from({ length: 256 }, (_, i) => linear(i));

/** Beyond this fraction of the width the output is exactly the HTML surface (text area). */
export const SURFACE_START = 0.68;
/** Half-range of the seam search around the requested position, as a fraction of width. */
export const SEAM_REACH = 0.12;
/**
 * Fraction of the protected subject kept past the seam centre: 1 at the seam (plus a small
 * margin), 0 where the background has fully become the surface.
 */
export function foregroundGate(distance: number, half: number): number {
	return 1 - smooth(half * 0.15, half, distance);
}

/**
 * Protected-subject layers resampled into the output frame (see banner-subject.ts).
 * `foregroundDelta` = F − C and `backgroundDelta` = B − C, both linear RGB.
 */
export type SubjectFrame = { alpha: Float32Array; foregroundDelta: Float32Array; backgroundDelta: Float32Array };

// Separable binomial Gaussian; explicit sampling makes the numerical pipeline repeatable.
function reduce(p: Plane): Plane {
	const { data, width: w, height: h, channels: c } = p;
	const nw = Math.ceil(w / 2), nh = Math.ceil(h / 2);
	const temp = new Float32Array(nw * h * c), out = new Float32Array(nw * nh * c);
	const kernel = [1, 4, 6, 4, 1];
	for (let y = 0; y < h; y++) for (let x = 0; x < nw; x++) for (let ch = 0; ch < c; ch++) {
		let sum = 0;
		for (let k = -2; k <= 2; k++) sum += data[(y * w + clamp(x * 2 + k, 0, w - 1)) * c + ch] * kernel[k + 2];
		temp[(y * nw + x) * c + ch] = sum / 16;
	}
	for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) for (let ch = 0; ch < c; ch++) {
		let sum = 0;
		for (let k = -2; k <= 2; k++) sum += temp[(clamp(y * 2 + k, 0, h - 1) * nw + x) * c + ch] * kernel[k + 2];
		out[(y * nw + x) * c + ch] = sum / 16;
	}
	return { data: out, width: nw, height: nh, channels: c };
}
function expand(p: Plane, width: number, height: number): Plane {
	const { data, width: w, height: h, channels: c } = p;
	const out = new Float32Array(width * height * c);
	for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
		const sx = Math.min(x / 2, w - 1), sy = Math.min(y / 2, h - 1);
		const x0 = Math.floor(sx), y0 = Math.floor(sy), x1 = Math.min(x0 + 1, w - 1), y1 = Math.min(y0 + 1, h - 1);
		const fx = sx - x0, fy = sy - y0;
		for (let ch = 0; ch < c; ch++) out[(y * width + x) * c + ch] =
			(data[(y0 * w + x0) * c + ch] * (1 - fx) + data[(y0 * w + x1) * c + ch] * fx) * (1 - fy) +
			(data[(y1 * w + x0) * c + ch] * (1 - fx) + data[(y1 * w + x1) * c + ch] * fx) * fy;
	}
	return { data: out, width, height, channels: c };
}

export type SeamBounds = { lo: number; hi: number; half: number };
export function seamBounds(w: number, config: BannerBlendConfig): SeamBounds {
	const half = config.width * w / 2;
	const hi = Math.max(half + 2, SURFACE_START * w - half);
	const lo = Math.min(hi, Math.max(half + 2, (config.position - SEAM_REACH) * w));
	return { lo, hi: Math.min(hi, Math.max(lo, (config.position + SEAM_REACH) * w)), half };
}

/**
 * Per-pixel cost of placing the transition centre at (x, y). The transition band washes out
 * whatever it covers, so besides the edge crossed by the centre line the cost integrates
 * detail energy under the band (weighted by how much each pixel fades) and, when a subject
 * is protected, the protected alpha that the foreground gate would fade.
 */
function seamCost(source: Float32Array, w: number, h: number, config: BannerBlendConfig, bounds: SeamBounds, subject: SubjectFrame | null) {
	const { lo, hi, half } = bounds;
	const x0 = Math.floor(lo), x1 = Math.ceil(hi), n = x1 - x0 + 1;
	const luma = new Float32Array(w * h);
	// Perceptual (gamma-encoded) luma so dark-region detail is not undervalued.
	for (let p = 0; p < w * h; p++) luma[p] = (source[p * 3] * 0.2126 + source[p * 3 + 1] * 0.7152 + source[p * 3 + 2] * 0.0722) ** (1 / 2.2);
	const edge = new Float32Array(w * h);
	for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
		const at = (dx: number, dy: number) => luma[clamp(y + dy, 0, h - 1) * w + clamp(x + dx, 0, w - 1)];
		const gx = at(1, -1) + 2 * at(1, 0) + at(1, 1) - at(-1, -1) - 2 * at(-1, 0) - at(-1, 1);
		const gy = at(-1, 1) + 2 * at(0, 1) + at(1, 1) - at(-1, -1) - 2 * at(0, -1) - at(1, -1);
		edge[y * w + x] = Math.hypot(gx, gy) / 4;
	}
	// Local detail energy (edge density) distinguishes textured subjects from isolated edges.
	const radius = Math.max(2, Math.round(h * 0.02));
	const detail = new Float32Array(w * h), rowSum = new Float64Array(w + 1);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			let s = 0;
			for (let dy = -radius; dy <= radius; dy++) s += edge[clamp(y + dy, 0, h - 1) * w + x];
			rowSum[x + 1] = rowSum[x] + s;
		}
		for (let x = 0; x < w; x++) {
			const a = Math.max(0, x - radius), b = Math.min(w, x + radius + 1);
			detail[y * w + x] = (rowSum[b] - rowSum[a]) / ((b - a) * (2 * radius + 1));
		}
	}
	const cost = new Float32Array(n * h);
	const band = Math.ceil(half);
	const fade = new Float32Array(2 * band + 1), gate = new Float32Array(band + 1);
	for (let k = -band; k <= band; k++) fade[k + band] = smooth(-half, half, k);
	// Pixel centres sit at k + 0.5 from an integer seam column (see seamDistance).
	for (let k = 0; k <= band; k++) gate[k] = 1 - foregroundGate(k + 0.5, half);
	const center = config.position * w;
	for (let y = 0; y < h; y++) for (let j = 0; j < n; j++) {
		const x = x0 + j, row = y * w;
		let washed = 0, faded = 0;
		for (let k = -band; k <= band; k += 2) {
			const xx = x + k;
			if (xx >= 0 && xx < w) washed += detail[row + xx] * fade[k + band];
		}
		if (subject) for (let k = 0; k <= band; k++) {
			const xx = x + k;
			if (xx < w) faded += subject.alpha[row + xx] * gate[k];
		}
		const prior = ((x - center) / (SEAM_REACH * w)) ** 2;
		cost[y * n + j] = 3 * edge[row + x] + 4 * detail[row + x] + 2 * washed / (band + 1) + 40 * faded / (band + 1) + 0.06 * prior;
	}
	return { cost, x0, n };
}

/**
 * Bounded top-to-bottom minimum-cost path with a bend penalty, followed by a small fixed
 * Gaussian smoothing so the transition follows a natural curve. Fixed traversal and
 * tie-breaking; no random search.
 */
export function findSeam(source: Float32Array, w: number, h: number, config: BannerBlendConfig, subject: SubjectFrame | null = null): Float32Array {
	const bounds = seamBounds(w, config);
	const straight = clamp(config.position * w, bounds.lo, bounds.hi);
	const result = new Float32Array(h).fill(straight);
	if (!config.contentAware && !subject) return result;
	const { cost, x0, n } = seamCost(source, w, h, config, bounds, subject);
	let prev = new Float64Array(n), next = new Float64Array(n);
	const back = new Int8Array(n * h);
	const bend = 0.015;
	for (let j = 0; j < n; j++) prev[j] = cost[j];
	for (let y = 1; y < h; y++) {
		for (let j = 0; j < n; j++) {
			let best = prev[j], direction = 0;
			if (j > 0 && prev[j - 1] + bend < best) { best = prev[j - 1] + bend; direction = -1; }
			if (j + 1 < n && prev[j + 1] + bend < best) { best = prev[j + 1] + bend; direction = 1; }
			next[j] = best + cost[y * n + j];
			back[y * n + j] = direction;
		}
		[prev, next] = [next, prev];
	}
	let best = 0;
	for (let j = 1; j < n; j++) if (prev[j] < prev[best]) best = j;
	for (let y = h - 1; y >= 0; y--) { result[y] = x0 + best; best += back[y * n + best]; }
	const sigma = Math.max(2, h * 0.025), taps = Math.ceil(sigma * 3), smoothed = new Float32Array(h);
	for (let y = 0; y < h; y++) {
		let sum = 0, total = 0;
		for (let k = -taps; k <= taps; k++) { const weight = Math.exp(-(k * k) / (2 * sigma * sigma)); sum += result[clamp(y + k, 0, h - 1)] * weight; total += weight; }
		smoothed[y] = clamp(sum / total, bounds.lo, bounds.hi);
	}
	return smoothed;
}

/**
 * Signed distance to the seam measured across the boundary: horizontal offset scaled by
 * the local slope. The max() with the surface limit guarantees the exact HTML color from
 * SURFACE_START onwards even where the curve is steep.
 */
export function seamDistance(path: Float32Array, w: number, h: number, half: number): Float32Array {
	const distance = new Float32Array(w * h), limit = SURFACE_START * w;
	for (let y = 0; y < h; y++) {
		const slope = (path[Math.min(h - 1, y + 1)] - path[Math.max(0, y - 1)]) / 2;
		const scale = 1 / Math.sqrt(1 + slope * slope);
		for (let x = 0; x < w; x++) distance[y * w + x] = Math.max((x + 0.5 - path[y]) * scale, x + 0.5 - limit + half);
	}
	return distance;
}

function multiband(source: Plane, mask: Plane, surface: number[]): Float32Array {
	const images = [source], masks = [mask];
	while (images.length < 7 && images[images.length - 1].height > 4) {
		images.push(reduce(images[images.length - 1])); masks.push(reduce(masks[masks.length - 1]));
	}
	let i = images.length - 1;
	let reconstructed: Plane = { ...images[i], data: images[i].data.map((v, k) => (v - surface[k % 3]) * masks[i].data[Math.floor(k / 3)] + surface[k % 3]) };
	for (i--; i >= 0; i--) {
		const current = images[i], lower = expand(images[i + 1], current.width, current.height);
		const up = expand(reconstructed, current.width, current.height);
		for (let k = 0; k < up.data.length; k++) up.data[k] += (current.data[k] - lower.data[k]) * masks[i].data[Math.floor(k / 3)];
		reconstructed = up;
	}
	return reconstructed.data;
}

// Screened Poisson: match the tapered source gradients while anchoring color to the
// initial composite. Screening prevents unbounded color shifts onto a flat surface. The
// solve domain follows the seam; pixels outside it are fixed boundary values.
function poisson(source: Float32Array, initial: Float32Array, mask: Float32Array, distance: Float32Array, half: number, w: number, h: number): Float32Array {
	const out = initial.slice(), rhs = new Float32Array(out.length), inside = new Uint8Array(w * h);
	const screen = 0.06;
	for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
		const p = y * w + x;
		if (distance[p] < -half * 1.3 || distance[p] > half) continue;
		inside[p] = 1;
		for (let ch = 0; ch < 3; ch++) {
			let divergence = 0;
			for (const q of [p - 1, p + 1, p - w, p + w]) divergence += (source[p * 3 + ch] - source[q * 3 + ch]) * (mask[p] + mask[q]) / 2;
			rhs[p * 3 + ch] = divergence + screen * initial[p * 3 + ch];
		}
	}
	// Fixed sweep count and red/black order make the solve deterministic.
	for (let iteration = 0; iteration < 180; iteration++) for (let parity = 0; parity < 2; parity++) {
		for (let y = 1; y < h - 1; y++) for (let x = 1 + ((1 + y + parity) % 2); x < w - 1; x += 2) {
			const i = y * w + x;
			if (!inside[i]) continue;
			const p = i * 3;
			for (let ch = 0; ch < 3; ch++) out[p + ch] = (out[p - 3 + ch] + out[p + 3 + ch] + out[p - w * 3 + ch] + out[p + w * 3 + ch] + rhs[p + ch]) / (4 + screen);
		}
	}
	return out;
}

export function surfaceLinear(surface: string): number[] {
	return [1, 3, 5].map((i) => linear(parseInt(surface.slice(i, i + 2), 16)));
}

export type BlendDiagnostics = { path: Float32Array };

/**
 * Blends the cropped artwork into the HTML surface color. Without a subject this is the
 * background blend alone. With a subject frame, the background is first replaced by its
 * estimated original background under the subject, blended, and then the decontaminated
 * foreground is composited over it: out = a·F + (1 − a)·B, a = α·gate(distance).
 */
export function blendBannerPixels(rgba: Uint8ClampedArray, w: number, h: number, config: BannerBlendConfig,
	subject: SubjectFrame | null = null, diagnostics?: BlendDiagnostics): Uint8ClampedArray {
	const surface = surfaceLinear(config.surface);
	const n = w * h;
	const source = new Float32Array(n * 3);
	for (let p = 0; p < n; p++) for (let ch = 0; ch < 3; ch++) source[p * 3 + ch] = LINEAR[rgba[p * 4 + ch]];
	const path = findSeam(source, w, h, config, subject);
	if (diagnostics) diagnostics.path = path;
	const { half } = seamBounds(w, config);
	const distance = seamDistance(path, w, h, half);

	// Background input: under a protected subject, the push–pull estimate of what lies behind it.
	let background = source;
	if (subject) {
		background = new Float32Array(n * 3);
		for (let k = 0; k < n * 3; k++) background[k] = source[k] + subject.backgroundDelta[k];
	}
	const mask = new Float32Array(n), initial = new Float32Array(n * 3);
	for (let p = 0; p < n; p++) {
		mask[p] = 1 - smooth(-half, half, distance[p]);
		for (let ch = 0; ch < 3; ch++) initial[p * 3 + ch] = background[p * 3 + ch] * mask[p] + surface[ch] * (1 - mask[p]);
	}
	const blended = config.method === 'multiband'
		? multiband({ data: background, width: w, height: h, channels: 3 }, { data: mask, width: w, height: h, channels: 1 }, surface)
		: config.method === 'poisson' ? poisson(background, initial, mask, distance, half, w, h) : initial;

	const output = new Uint8ClampedArray(rgba.length);
	for (let p = 0; p < n; p++) {
		const d = distance[p];
		// Seam-relative guards: untouched art before the band, exact surface after it.
		const enter = smooth(-half * 1.3, -half, d), leave = smooth(half * 0.85, half, d);
		const a = subject ? subject.alpha[p] * foregroundGate(d, half) : 0;
		for (let ch = 0; ch < 3; ch++) {
			const k = p * 3 + ch;
			const foreground = subject ? source[k] + subject.foregroundDelta[k] : 0;
			const composite = a * foreground + (1 - a) * blended[k];
			const value = source[k] * (1 - enter) + composite * enter;
			output[p * 4 + ch] = srgb(value * (1 - leave) + surface[ch] * leave);
		}
		output[p * 4 + 3] = 255;
	}
	return output;
}
