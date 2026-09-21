import type { BannerBlendConfig } from './banner-blend';

type Plane = { data: Float32Array; width: number; height: number; channels: number };
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
function smooth(lo: number, hi: number, n: number): number {
	const t = clamp((n - lo) / (hi - lo), 0, 1);
	return t * t * (3 - 2 * t);
}
function linear(n: number): number { n /= 255; return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; }
function srgb(n: number): number { n = clamp(n, 0, 1); return Math.round(255 * (n <= 0.0031308 ? n * 12.92 : 1.055 * n ** (1 / 2.4) - 0.055)); }

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

// Bounded top-to-bottom minimum-cost path. Fixed traversal/tie-breaking, no random search.
function seam(source: Float32Array, w: number, h: number, config: BannerBlendConfig): Float32Array {
	const result = new Float32Array(h).fill(config.position * w);
	if (!config.contentAware) return result;
	const lo = Math.max(2, Math.floor((config.position - 0.045) * w));
	const hi = Math.min(w - 3, Math.ceil((config.position + 0.045) * w));
	const n = hi - lo + 1;
	let prev = new Float64Array(n), next = new Float64Array(n);
	const back = new Int8Array(n * h);
	const lum = (x: number, y: number) => {
		const i = (y * w + x) * 3;
		return source[i] * 0.2126 + source[i + 1] * 0.7152 + source[i + 2] * 0.0722;
	};
	for (let y = 0; y < h; y++) {
		for (let j = 0; j < n; j++) {
			const x = lo + j;
			let cost = prev[j], direction = 0;
			if (j > 0 && prev[j - 1] + 0.006 < cost) { cost = prev[j - 1] + 0.006; direction = -1; }
			if (j + 1 < n && prev[j + 1] + 0.006 < cost) { cost = prev[j + 1] + 0.006; direction = 1; }
			const detail = Math.abs(lum(x + 1, y) - lum(x - 1, y)) + Math.abs(lum(x, Math.min(h - 1, y + 1)) - lum(x, Math.max(0, y - 1)));
			next[j] = cost + detail * 4 + 0.04 * ((x / w - config.position) / 0.045) ** 2;
			back[y * n + j] = direction;
		}
		[prev, next] = [next, prev];
	}
	let best = 0;
	for (let j = 1; j < n; j++) if (prev[j] < prev[best]) best = j;
	for (let y = h - 1; y >= 0; y--) { result[y] = lo + best; best += back[y * n + best]; }
	return result;
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
// initial composite. Screening prevents unbounded color shifts onto a flat surface.
function poisson(source: Float32Array, initial: Float32Array, mask: Float32Array, w: number, h: number): Float32Array {
	const out = initial.slice(), rhs = new Float32Array(out.length);
	const screen = 0.06;
	const lo = Math.max(1, Math.floor(w * 0.18)), hi = Math.min(w - 1, Math.ceil(w * 0.68));
	for (let y = 1; y < h - 1; y++) for (let x = lo; x < hi; x++) {
		const p = y * w + x;
		for (let ch = 0; ch < 3; ch++) {
			let divergence = 0;
			for (const q of [p - 1, p + 1, p - w, p + w]) divergence += (source[p * 3 + ch] - source[q * 3 + ch]) * (mask[p] + mask[q]) / 2;
			rhs[p * 3 + ch] = divergence + screen * initial[p * 3 + ch];
		}
	}
	// Fixed sweep count and red/black order make the solve deterministic.
	for (let iteration = 0; iteration < 180; iteration++) for (let parity = 0; parity < 2; parity++) {
		for (let y = 1; y < h - 1; y++) for (let x = lo + ((lo + y + parity) % 2); x < hi; x += 2) {
			const p = (y * w + x) * 3;
			for (let ch = 0; ch < 3; ch++) out[p + ch] = (out[p - 3 + ch] + out[p + 3 + ch] + out[p - w * 3 + ch] + out[p + w * 3 + ch] + rhs[p + ch]) / (4 + screen);
		}
	}
	return out;
}

export function blendBannerPixels(rgba: Uint8ClampedArray, w: number, h: number, config: BannerBlendConfig): Uint8ClampedArray {
	const surface = [1, 3, 5].map((i) => linear(parseInt(config.surface.slice(i, i + 2), 16)));
	const source = new Float32Array(w * h * 3);
	for (let p = 0; p < w * h; p++) for (let ch = 0; ch < 3; ch++) source[p * 3 + ch] = linear(rgba[p * 4 + ch]);
	const path = seam(source, w, h, config), mask = new Float32Array(w * h), initial = new Float32Array(source.length);
	for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
		const p = y * w + x;
		mask[p] = 1 - smooth(path[y] - config.width * w / 2, Math.min(w * 0.65, path[y] + config.width * w / 2), x);
		for (let ch = 0; ch < 3; ch++) initial[p * 3 + ch] = source[p * 3 + ch] * mask[p] + surface[ch] * (1 - mask[p]);
	}
	const blended = config.method === 'multiband'
		? multiband({ data: source, width: w, height: h, channels: 3 }, { data: mask, width: w, height: h, channels: 1 }, surface)
		: config.method === 'poisson' ? poisson(source, initial, mask, w, h) : initial;
	const output = new Uint8ClampedArray(rgba.length);
	for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
		const p = y * w + x;
		const enter = smooth(0.16 * w, 0.26 * w, x), leave = smooth(0.62 * w, 0.68 * w, x);
		for (let ch = 0; ch < 3; ch++) {
			const value = source[p * 3 + ch] * (1 - enter) + blended[p * 3 + ch] * enter;
			output[p * 4 + ch] = srgb(value * (1 - leave) + surface[ch] * leave);
		}
		output[p * 4 + 3] = 255;
	}
	return output;
}
