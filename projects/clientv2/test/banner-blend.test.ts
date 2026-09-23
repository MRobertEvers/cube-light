import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BannerWasm } from '../src/platform/wasm/banner-wasm';
import { DEFAULT_BANNER_BLEND } from '../src/domain/appearance/banner-blend';
import type { BannerBlendConfig } from '../src/domain/appearance/banner-blend';

const wasm = await BannerWasm.create(
	readFileSync(new URL('../src/platform/wasm/banner-blend.wasm', import.meta.url))
);
const blendBannerPixels: BannerWasm['blend'] = function blendBannerPixels(
	rgba,
	w,
	h,
	config,
	subjectArg,
	diagnostics
) {
	return wasm.blend(rgba, w, h, config, subjectArg, diagnostics);
};
function blendConfig(
	method: BannerBlendConfig['method'],
	contentAware: boolean
): BannerBlendConfig {
	return {
		version: DEFAULT_BANNER_BLEND.version,
		method,
		contentAware,
		position: DEFAULT_BANNER_BLEND.position,
		width: DEFAULT_BANNER_BLEND.width,
		surface: DEFAULT_BANNER_BLEND.surface,
		protectSubject: DEFAULT_BANNER_BLEND.protectSubject,
		protection: DEFAULT_BANNER_BLEND.protection,
		feather: DEFAULT_BANNER_BLEND.feather,
		decontamination: DEFAULT_BANNER_BLEND.decontamination
	};
}
const width = 160,
	height = 48;
function fixture(solidArg?: boolean) {
	const solid = solidArg === undefined ? false : solidArg;

	const pixels = new Uint8ClampedArray(width * height * 4);
	for (let y = 0; y < height; y++)
		for (let x = 0; x < width; x++) {
			const p = (y * width + x) * 4;
			pixels[p] = solid ? 242 : (x * 13 + y * 7) % 256;
			pixels[p + 1] = solid ? 233 : (x * 3 + y * 19) % 256;
			pixels[p + 2] = solid ? 230 : (x * 17 + y * 5) % 256;
			pixels[p + 3] = 255;
		}
	return pixels;
}
for (const method of ['multiband', 'poisson', 'fade'] as const) {
	test(`${method} preserves a matching solid surface`, () => {
		const pixels = fixture(true);
		assert.deepEqual(
			blendBannerPixels(
				pixels,
				width,
				height,
				blendConfig(method, DEFAULT_BANNER_BLEND.contentAware)
			),
			pixels
		);
	});
	test(`${method} is deterministic and preserves both outer regions`, () => {
		const source = fixture(),
			config = blendConfig(method, DEFAULT_BANNER_BLEND.contentAware);
		const first = blendBannerPixels(source, width, height, config);
		assert.deepEqual(
			first,
			blendBannerPixels(source, width, height, config)
		);
		for (let y = 0; y < height; y++) {
			const left = y * width * 4,
				right = (y * width + width - 1) * 4;
			assert.deepEqual(
				first.slice(left, left + 4),
				source.slice(left, left + 4)
			);
			assert.deepEqual(
				Array.from(first.slice(right, right + 4)),
				[242, 233, 230, 255]
			);
		}
	});
}
test('multiband, Poisson, and content-aware seams change the composite', () => {
	const source = fixture();
	const fade = blendBannerPixels(source, width, height, blendConfig('fade', false));
	assert.notDeepEqual(
		fade,
		blendBannerPixels(source, width, height, blendConfig('multiband', false))
	);
	assert.notDeepEqual(
		fade,
		blendBannerPixels(source, width, height, blendConfig('poisson', false))
	);
	assert.notDeepEqual(
		fade,
		blendBannerPixels(source, width, height, blendConfig('fade', true))
	);
});
