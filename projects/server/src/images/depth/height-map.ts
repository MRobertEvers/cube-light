/**
 * Height maps for card art, the way MTG Arena's depth arts look: a port of mtg-ai's
 * torimtg/server/depth_worker.py, pipeline 1, so a map made here is the map torimtgd makes
 * and the two servers share them in the art cache (3rd/artcache/FORMAT.md) under one stamp.
 *
 * Depth-Anything V2 Small estimates the art's relative inverse depth. The output is upsampled
 * to the art's size, blurred, stretched to 0..1, put through a tone curve learnt from Arena's
 * own depth arts, and written as one byte per pixel: 105 is the farthest point, 223 the nearest.
 *
 * Each step reproduces what the Python pipeline does, so the numbers agree:
 * - the model's input: transformers' DPTImageProcessor (keep the aspect ratio, a multiple of 14
 *   near 518, Pillow's 8-bit bicubic resample, rescale, ImageNet normalisation);
 * - the upsampling: torch's bicubic interpolate (A = -0.75, align_corners false);
 * - the blur: a separable Gaussian with replicated edges.
 *
 * When mtg-ai bumps depth_worker.PIPELINE, port its change here and bump DEPTH_PIPELINE.
 */

export const DEPTH_MODEL = 'depth-anything/Depth-Anything-V2-Small-hf';
export const DEPTH_PIPELINE = 1;
/** What made a map, as depth_worker.stamp() writes it into the PNG. */
export const DEPTH_STAMP = `${DEPTH_MODEL} pipeline ${DEPTH_PIPELINE}`;

// The model's input: DPTImageProcessor's settings for Depth-Anything V2.
const INPUT_SIZE = 518;
const INPUT_MULTIPLE = 14;
const IMAGE_MEAN = [0.485, 0.456, 0.406];
const IMAGE_STD = [0.229, 0.224, 0.225];

// Arena's alpha bytes: most depth arts span exactly 105..223.
const LO = 105;
const SPAN = 118;
// The Gaussian blur's sigma as a fraction of the art's width.
const BLUR = 4.0 / 512.0;
// The tone curve: quantiles of the model's blurred, normalised output (CURVE_X) mapped onto the
// same quantiles of Arena's maps (CURVE_Y).
const CURVE_X = [
	0.0, 0.0028, 0.0137, 0.0254, 0.0395, 0.0557, 0.073, 0.0917, 0.1133, 0.1367, 0.1609,
	0.186, 0.2123, 0.2412, 0.2725, 0.3045, 0.3381, 0.3727, 0.4069, 0.4406, 0.4758, 0.5089,
	0.5432, 0.5803, 0.6188, 0.6584, 0.7006, 0.7411, 0.7813, 0.8252, 0.8724, 0.9236, 1.0
];
const CURVE_Y = [
	0.0, 0.0085, 0.0233, 0.0508, 0.0847, 0.1064, 0.1386, 0.1709, 0.2097, 0.2308, 0.2657,
	0.3017, 0.3368, 0.3626, 0.3917, 0.4237, 0.4476, 0.4783, 0.5098, 0.541, 0.5688, 0.5932,
	0.6186, 0.6522, 0.6863, 0.7193, 0.7449, 0.7826, 0.8222, 0.8559, 0.8898, 0.9649, 1.0
];

export type RgbImage = { width: number; height: number; rgb: Uint8Array };
export type ModelInput = { width: number; height: number; data: Float32Array };

/** DPT's constrain_to_multiple_of, with no bounds. */
function toMultiple(value: number, multiple: number): number {
	return Math.round(value / multiple) * multiple;
}

/** The size the model reads an art at: scaled as little as possible to reach 518 on one side. */
export function modelInputSize(width: number, height: number): { width: number; height: number } {
	let scaleWidth = INPUT_SIZE / width;
	let scaleHeight = INPUT_SIZE / height;
	if (Math.abs(1 - scaleWidth) < Math.abs(1 - scaleHeight)) scaleHeight = scaleWidth;
	else scaleWidth = scaleHeight;
	return {
		width: toMultiple(scaleWidth * width, INPUT_MULTIPLE),
		height: toMultiple(scaleHeight * height, INPUT_MULTIPLE)
	};
}

// -- Pillow's 8-bit resample (libImaging/Resample.c), bicubic -------------------------------

const PRECISION_BITS = 32 - 8 - 2;

function pillowBicubic(xArg: number): number {
	const a = -0.5;
	const x = xArg < 0 ? -xArg : xArg;
	if (x < 1.0) return ((a + 2.0) * x - (a + 3.0)) * x * x + 1;
	if (x < 2.0) return (((x - 5) * x + 8) * x - 4) * a;
	return 0.0;
}

type Coefficients = { size: number; bounds: Int32Array; weights: Int32Array };

/** precompute_coeffs and normalize_coeffs_8bpc: for each output pixel, its first source pixel,
 * how many it reads, and their fixed-point weights. */
function pillowCoefficients(inSize: number, outSize: number): Coefficients {
	const scale = inSize / outSize;
	const filterScale = scale < 1.0 ? 1.0 : scale;
	const support = 2.0 * filterScale;
	const size = Math.ceil(support) * 2 + 1;
	const bounds = new Int32Array(outSize * 2);
	const weights = new Int32Array(outSize * size);
	const row = new Float64Array(size);
	for (let xx = 0; xx < outSize; xx++) {
		const center = (xx + 0.5) * scale;
		const ss = 1.0 / filterScale;
		let xmin = Math.trunc(center - support + 0.5);
		if (xmin < 0) xmin = 0;
		let xmax = Math.trunc(center + support + 0.5);
		if (xmax > inSize) xmax = inSize;
		xmax -= xmin;
		let total = 0.0;
		for (let x = 0; x < xmax; x++) {
			const w = pillowBicubic((x + xmin - center + 0.5) * ss);
			row[x] = w;
			total += w;
		}
		for (let x = 0; x < size; x++) {
			const w = x < xmax && total !== 0.0 ? row[x] / total : 0.0;
			weights[xx * size + x] =
				w < 0 ? Math.trunc(-0.5 + w * (1 << PRECISION_BITS)) : Math.trunc(0.5 + w * (1 << PRECISION_BITS));
		}
		bounds[xx * 2] = xmin;
		bounds[xx * 2 + 1] = xmax;
	}
	return { size, bounds, weights };
}

function clip8(value: number): number {
	const shifted = Math.floor(value / (1 << PRECISION_BITS));
	return shifted < 0 ? 0 : shifted > 255 ? 255 : shifted;
}

/** Image.resize((width, height), Image.BICUBIC) of an RGB image: horizontally, then vertically,
 * each pass rounded to bytes, as Pillow does. */
export function resizeBicubic(image: RgbImage, width: number, height: number): RgbImage {
	const { width: inWidth, height: inHeight, rgb } = image;
	const horizontal = pillowCoefficients(inWidth, width);
	const vertical = pillowCoefficients(inHeight, height);
	const half = 1 << (PRECISION_BITS - 1);

	let wide = rgb;
	if (width !== inWidth) {
		wide = new Uint8Array(width * inHeight * 3);
		for (let y = 0; y < inHeight; y++) {
			for (let xx = 0; xx < width; xx++) {
				const xmin = horizontal.bounds[xx * 2];
				const count = horizontal.bounds[xx * 2 + 1];
				const k = xx * horizontal.size;
				for (let c = 0; c < 3; c++) {
					let sum = half;
					for (let x = 0; x < count; x++)
						sum += rgb[(y * inWidth + xmin + x) * 3 + c] * horizontal.weights[k + x];
					wide[(y * width + xx) * 3 + c] = clip8(sum);
				}
			}
		}
	}
	if (height === inHeight) return { width, height, rgb: wide };
	const out = new Uint8Array(width * height * 3);
	for (let yy = 0; yy < height; yy++) {
		const ymin = vertical.bounds[yy * 2];
		const count = vertical.bounds[yy * 2 + 1];
		const k = yy * vertical.size;
		for (let x = 0; x < width * 3; x++) {
			let sum = half;
			for (let y = 0; y < count; y++) sum += wide[(ymin + y) * width * 3 + x] * vertical.weights[k + y];
			out[yy * width * 3 + x] = clip8(sum);
		}
	}
	return { width, height, rgb: out };
}

/** The model's pixel_values: the art resized, rescaled to 0..1 and normalised, channels first. */
export function modelInput(image: RgbImage): ModelInput {
	const size = modelInputSize(image.width, image.height);
	const resized = resizeBicubic(image, size.width, size.height);
	const plane = size.width * size.height;
	const data = new Float32Array(plane * 3);
	for (let i = 0; i < plane; i++) {
		for (let c = 0; c < 3; c++) {
			const value = Math.fround(resized.rgb[i * 3 + c] * 0.00392156862745098);
			data[c * plane + i] = (value - Math.fround(IMAGE_MEAN[c])) / Math.fround(IMAGE_STD[c]);
		}
	}
	return { width: size.width, height: size.height, data };
}

// -- torch's bicubic interpolate (align_corners false) --------------------------------------

const TORCH_A = -0.75;

function cubicNear(x: number): number {
	return ((TORCH_A + 2) * x - (TORCH_A + 3)) * x * x + 1;
}

function cubicFar(x: number): number {
	return ((TORCH_A * x - 5 * TORCH_A) * x + 8 * TORCH_A) * x - 4 * TORCH_A;
}

function cubicWeights(t: number): [number, number, number, number] {
	return [cubicFar(t + 1), cubicNear(t), cubicNear(1 - t), cubicFar(2 - t)];
}

/** F.interpolate(x, size=(height, width), mode="bicubic", align_corners=False), edges clamped. */
export function upsampleBicubic(
	data: Float32Array,
	inWidth: number,
	inHeight: number,
	width: number,
	height: number
): Float32Array {
	const out = new Float32Array(width * height);
	const scaleX = inWidth / width;
	const scaleY = inHeight / height;
	const xs = new Int32Array(width * 4);
	const wx = new Float64Array(width * 4);
	for (let x = 0; x < width; x++) {
		const real = scaleX * (x + 0.5) - 0.5;
		const base = Math.floor(real);
		const weights = cubicWeights(real - base);
		for (let i = 0; i < 4; i++) {
			xs[x * 4 + i] = Math.min(Math.max(base - 1 + i, 0), inWidth - 1);
			wx[x * 4 + i] = weights[i];
		}
	}
	const rows = new Float64Array(4);
	for (let y = 0; y < height; y++) {
		const real = scaleY * (y + 0.5) - 0.5;
		const base = Math.floor(real);
		const wy = cubicWeights(real - base);
		for (let x = 0; x < width; x++) {
			for (let j = 0; j < 4; j++) {
				const row = Math.min(Math.max(base - 1 + j, 0), inHeight - 1) * inWidth;
				rows[j] =
					data[row + xs[x * 4]] * wx[x * 4] +
					data[row + xs[x * 4 + 1]] * wx[x * 4 + 1] +
					data[row + xs[x * 4 + 2]] * wx[x * 4 + 2] +
					data[row + xs[x * 4 + 3]] * wx[x * 4 + 3];
			}
			out[y * width + x] = rows[0] * wy[0] + rows[1] * wy[1] + rows[2] * wy[2] + rows[3] * wy[3];
		}
	}
	return out;
}

/** Separable Gaussian blur, edges replicated (depth_worker's _blur). */
export function blur(data: Float32Array, width: number, height: number, sigma: number): Float32Array {
	if (sigma < 0.5) return data;
	const r = Math.trunc(3 * sigma + 0.5);
	const kernel = new Float32Array(2 * r + 1);
	let total = 0;
	for (let i = -r; i <= r; i++) {
		kernel[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma));
		total += kernel[i + r];
	}
	for (let i = 0; i < kernel.length; i++) kernel[i] /= total;
	const across = new Float32Array(width * height);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let sum = 0;
			for (let i = -r; i <= r; i++) {
				const sx = Math.min(Math.max(x + i, 0), width - 1);
				sum += data[y * width + sx] * kernel[i + r];
			}
			across[y * width + x] = sum;
		}
	}
	const out = new Float32Array(width * height);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let sum = 0;
			for (let i = -r; i <= r; i++) {
				const sy = Math.min(Math.max(y + i, 0), height - 1);
				sum += across[sy * width + x] * kernel[i + r];
			}
			out[y * width + x] = sum;
		}
	}
	return out;
}

/** numpy's interp over the tone curve. */
function curve(x: number): number {
	if (x <= CURVE_X[0]) return CURVE_Y[0];
	for (let i = 1; i < CURVE_X.length; i++) {
		if (x <= CURVE_X[i]) {
			const t = (x - CURVE_X[i - 1]) / (CURVE_X[i] - CURVE_X[i - 1]);
			return CURVE_Y[i - 1] + t * (CURVE_Y[i] - CURVE_Y[i - 1]);
		}
	}
	return CURVE_Y[CURVE_Y.length - 1];
}

/** numpy's rint: halves to even. */
function roundHalfEven(x: number): number {
	const floor = Math.floor(x);
	const diff = x - floor;
	if (diff > 0.5) return floor + 1;
	if (diff < 0.5) return floor;
	return floor % 2 === 0 ? floor : floor + 1;
}

/**
 * The height map of an art from the model's output (predicted_depth, relative inverse depth:
 * larger is nearer, at the model's input size): one byte per pixel at the art's size.
 */
export function heightMap(
	predicted: Float32Array,
	predictedWidth: number,
	predictedHeight: number,
	width: number,
	height: number
): Uint8Array {
	const upsampled = upsampleBicubic(predicted, predictedWidth, predictedHeight, width, height);
	const blurred = blur(upsampled, width, height, BLUR * width);
	let lo = Infinity;
	let hi = -Infinity;
	for (let i = 0; i < blurred.length; i++) {
		if (blurred[i] < lo) lo = blurred[i];
		if (blurred[i] > hi) hi = blurred[i];
	}
	const out = new Uint8Array(width * height);
	const span = hi - lo;
	for (let i = 0; i < blurred.length; i++) {
		const x = span > 1e-6 ? Math.fround((blurred[i] - lo) / span) : 0;
		const value = roundHalfEven(LO + SPAN * curve(x));
		out[i] = value < 0 ? 0 : value > 255 ? 255 : value;
	}
	return out;
}
