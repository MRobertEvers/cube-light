import {
	BANNER_BLEND_SIZES,
	hasProtection,
	type BannerBlendJob,
	type BannerBlendVariant,
	type BannerProtection
} from '../../domain/appearance/banner-blend';
import type { BannerWorkerRequest, BannerWorkerResponse } from './banner-blend.protocol';
import type { BannerCrop } from '../../domain/appearance/banner-crop';
import { computeSubjectLayer } from '../../platform/banner/banner-subject';
import {
	BannerWasm,
	type SubjectFrame,
	type SubjectLayer
} from '../../platform/wasm/banner-wasm';

function post(message: BannerWorkerResponse, transferArg?: Transferable[]) {
	const transfer = transferArg === undefined ? [] : transferArg;
	return (self as unknown as Worker).postMessage(message, transfer);
}

// All numeric pixel work runs in WebAssembly (native/banner_blend.c) for speed and cross-browser bit identity.
let wasmModule: Promise<BannerWasm> | null = null;
function loadWasm(): Promise<BannerWasm> {
	wasmModule ??= (async function () {
		const response = await fetch(
			new URL('../../platform/wasm/banner-blend.wasm', import.meta.url)
		);
		if (!response.ok)
			throw new Error(
				'The banner processor could not be downloaded. Reload the page and try again.'
			);
		return BannerWasm.create(await response.arrayBuffer());
	})().catch((error) => {
		wasmModule = null;
		throw error instanceof Error && error.message.startsWith('The banner')
			? error
			: new Error(
					'This browser could not start the banner processor (WebAssembly). Try a current browser.'
				);
	});
	return wasmModule;
}

async function decode(src: string): Promise<ImageBitmap> {
	let response: Response;
	try {
		response = await fetch(src);
	} catch {
		throw new Error(
			'Unable to download the banner artwork. Check your connection and try again.'
		);
	}
	if (!response.ok)
		throw new Error(
			`Unable to load the banner artwork (HTTP ${response.status}). Choose the artwork again or retry.`
		);
	try {
		return await createImageBitmap(await response.blob());
	} catch {
		throw new Error(
			'The banner artwork could not be decoded. Choose a different printing.'
		);
	}
}

function sourcePixels(bitmap: ImageBitmap): ImageData {
	const canvas = new OffscreenCanvas(bitmap.width, bitmap.height),
		context = canvas.getContext('2d');
	if (!context)
		throw new Error('Banner rendering is unavailable in this browser.');
	context.drawImage(bitmap, 0, 0);
	return context.getImageData(0, 0, bitmap.width, bitmap.height);
}

/** Same placement as the live SpotlightCard art: cover-scale into 78% of the width, then pan/zoom. */
function placement(
	variant: BannerBlendVariant,
	crop: BannerCrop,
	bitmap: { width: number; height: number }
) {
	const [width, height] = BANNER_BLEND_SIZES[variant];
	const frame = variant === 'mobile' ? crop.mobile : crop.desktop;
	const artWidth = width * 0.78;
	const scale =
		Math.max(artWidth / bitmap.width, height / bitmap.height) * frame.zoom;
	const imageWidth = bitmap.width * scale,
		imageHeight = bitmap.height * scale;
	const left =
		(artWidth - imageWidth) * Math.min(frame.x, 1) -
		Math.max(0, frame.x - 1) * artWidth;
	const top = (height - imageHeight) * frame.y;
	return { width, height, artWidth, left, top, imageWidth, imageHeight };
}

/** Bilinear resampling of the source-space subject layers into one output frame. */
function frameSubject(
	layer: SubjectLayer,
	place: ReturnType<typeof placement>
): SubjectFrame {
	const { width, height, artWidth, left, top, imageWidth, imageHeight } =
		place;
	const n = width * height,
		alpha = new Float32Array(n),
		foregroundDelta = new Float32Array(n * 3),
		backgroundDelta = new Float32Array(n * 3);
	const sw = layer.width,
		sh = layer.height;
	for (let y = 0; y < height; y++) {
		const v = ((y + 0.5 - top) / imageHeight) * sh - 0.5;
		if (v < -0.5 || v > sh - 0.5) continue;
		const y0 = Math.max(0, Math.floor(v)),
			y1 = Math.min(sh - 1, y0 + 1),
			fy = Math.min(1, Math.max(0, v - y0));
		for (let x = 0; x < Math.floor(artWidth); x++) {
			const u = ((x + 0.5 - left) / imageWidth) * sw - 0.5;
			if (u < -0.5 || u > sw - 0.5) continue;
			const x0 = Math.max(0, Math.floor(u)),
				x1 = Math.min(sw - 1, x0 + 1),
				fx = Math.min(1, Math.max(0, u - x0));
			const w00 = (1 - fx) * (1 - fy),
				w10 = fx * (1 - fy),
				w01 = (1 - fx) * fy,
				w11 = fx * fy;
			const a = y0 * sw + x0,
				b = y0 * sw + x1,
				c = y1 * sw + x0,
				d = y1 * sw + x1,
				p = y * width + x;
			alpha[p] =
				layer.alpha[a] * w00 +
				layer.alpha[b] * w10 +
				layer.alpha[c] * w01 +
				layer.alpha[d] * w11;
			for (let ch = 0; ch < 3; ch++) {
				foregroundDelta[p * 3 + ch] =
					layer.foregroundDelta[a * 3 + ch] * w00 +
					layer.foregroundDelta[b * 3 + ch] * w10 +
					layer.foregroundDelta[c * 3 + ch] * w01 +
					layer.foregroundDelta[d * 3 + ch] * w11;
				backgroundDelta[p * 3 + ch] =
					layer.backgroundDelta[a * 3 + ch] * w00 +
					layer.backgroundDelta[b * 3 + ch] * w10 +
					layer.backgroundDelta[c * 3 + ch] * w01 +
					layer.backgroundDelta[d * 3 + ch] * w11;
			}
		}
	}
	return { alpha, foregroundDelta, backgroundDelta };
}

async function encodePng(canvas: OffscreenCanvas): Promise<string> {
	const bytes = new Uint8Array(
		await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer()
	);
	let binary = '';
	for (let offset = 0; offset < bytes.length; offset += 8192)
		binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(offset, offset + 8192)));
	return btoa(binary);
}

async function generate(id: number, job: BannerBlendJob) {
	const timings: Record<string, number> = {};
	function progress(message: string, fraction: number) {
		return post({ id, progress: { message, fraction } });
	}
	let mark = performance.now();
	function lap(name: string) {
		const now = performance.now();
		timings[name] = Math.round(now - mark);
		mark = now;
	}
	progress('Loading banner artwork…', 0.02);
	const [wasm, bitmap] = await Promise.all([loadWasm(), decode(job.src)]);
	try {
		lap('decode');
		const { crop, config } = job;
		let layer: SubjectLayer | null = null;
		if (hasProtection(config, job.src)) {
			const pixels = sourcePixels(bitmap);
			layer = computeSubjectLayer(
				wasm,
				pixels.data,
				pixels.width,
				pixels.height,
				config.protection!,
				{
					feather: config.feather,
					decontamination: config.decontamination,
					onStage: function (stage) {
						if (stage === 'segment')
							progress(
								'Finding the protected subject (GrabCut)…',
								0.08
							);
						else if (stage === 'refine') {
							lap('segment');
							progress('Refining subject edges…', 0.28);
						} else {
							lap('refine');
							progress(
								'Removing background color from subject edges…',
								0.34
							);
						}
					}
				}
			);
			lap('decontaminate');
		}
		const images = {} as Record<BannerBlendVariant, string>;
		const variants = ['desktop', 'mobile', 'tile'] as const;
		for (const [index, variant] of variants.entries()) {
			const start = layer ? 0.4 : 0.1,
				fraction = start + ((0.95 - start) * index) / variants.length;
			progress(`Rendering ${variant} banner…`, fraction);
			const place = placement(variant, crop, bitmap);
			const {
				width,
				height,
				artWidth,
				left,
				top,
				imageWidth,
				imageHeight
			} = place;
			const canvas = new OffscreenCanvas(width, height),
				context = canvas.getContext('2d');
			if (!context)
				throw new Error(
					'Banner rendering is unavailable in this browser.'
				);
			context.fillStyle = config.surface;
			context.fillRect(0, 0, width, height);
			context.save();
			context.beginPath();
			context.rect(0, 0, artWidth, height);
			context.clip();
			context.drawImage(bitmap, left, top, imageWidth, imageHeight);
			context.restore();
			const pixels = context.getImageData(0, 0, width, height);
			lap(`draw-${variant}`);
			const subject = layer ? frameSubject(layer, place) : null;
			lap(`resample-${variant}`);
			pixels.data.set(
				wasm.blend(pixels.data, width, height, config, subject)
			);
			context.putImageData(pixels, 0, 0);
			lap(`blend-${variant}`);
			images[variant] = await encodePng(canvas);
			lap(`encode-${variant}`);
		}
		post({ id, images, timings });
	} finally {
		bitmap.close();
	}
}

async function mask(
	id: number,
	src: string,
	protection: BannerProtection,
	feather: number
) {
	const start = performance.now();
	post({
		id,
		progress: { message: 'Loading banner artwork…', fraction: 0.05 }
	});
	const [wasm, bitmap] = await Promise.all([loadWasm(), decode(src)]);
	try {
		const pixels = sourcePixels(bitmap);
		const layer = computeSubjectLayer(
			wasm,
			pixels.data,
			pixels.width,
			pixels.height,
			protection,
			{
				feather,
				decontamination: 0,
				onStage: function (stage) {
					return post({
						id,
						progress: {
							message:
								stage === 'segment'
									? 'Finding the subject…'
									: 'Refining edges…',
							fraction: stage === 'segment' ? 0.2 : 0.75
						}
					});
				}
			}
		);
		const alpha = new Uint8ClampedArray(layer.alpha.length);
		for (let p = 0; p < alpha.length; p++)
			alpha[p] = Math.round(layer.alpha[p] * 255);
		post(
			{
				id,
				mask: { width: layer.width, height: layer.height, alpha },
				timings: { total: Math.round(performance.now() - start) }
			},
			[alpha.buffer]
		);
	} finally {
		bitmap.close();
	}
}

self.addEventListener(
	'message',
	async (event: MessageEvent<BannerWorkerRequest>) => {
		const request = event.data;
		try {
			if (request.kind === 'generate')
				await generate(request.id, request.job);
			else
				await mask(
					request.id,
					request.src,
					request.protection,
					request.feather
				);
		} catch (error) {
			post({
				id: request.id,
				error:
					error instanceof Error
						? error.message
						: 'Unable to render the banner.'
			});
		}
	}
);
