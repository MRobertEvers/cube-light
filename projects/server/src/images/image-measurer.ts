import path from 'path';
import {
	IMAGE_META_VERSION,
	IMAGE_PALETTE_SAMPLE_SIZE,
	paletteFromPixels,
	previewFromPixels,
	previewSampleSize
} from '@torimtg/core';
import type { ImageMeta, ImageRef } from '@torimtg/core';

/** Works out what the browser needs to know about an image before it loads. */
export interface ImageMeasurer {
	/** Throws when the bytes are not a decodable image. */
	measure(image: Buffer, ref: ImageRef): ImageMeta;
}

// node-gyp builds into build/Release beside tsc's build/src.
const native = require(path.join(__dirname, '../../Release/image_sample.node')) as {
	info(image: Buffer): { width: number; height: number };
	sample(image: Buffer, sizes: Array<[number, number]>): Buffer[];
};

/**
 * Decodes once with stb_image (native/image_sample.c) into two small samples: a
 * square one for the palette, and one in the image's proportions for the preview.
 */
export class NativeImageMeasurer implements ImageMeasurer {
	measure(image: Buffer, ref: ImageRef): ImageMeta {
		const { width, height } = native.info(image);
		const preview = previewSampleSize(width, height);
		const [paletteSample, previewSample] = native.sample(image, [
			[IMAGE_PALETTE_SAMPLE_SIZE, IMAGE_PALETTE_SAMPLE_SIZE],
			[preview.width, preview.height]
		]);
		return {
			version: IMAGE_META_VERSION,
			variant: ref.variant,
			id: ref.id,
			width,
			height,
			palette: paletteFromPixels(paletteSample),
			preview: previewFromPixels(preview.width, preview.height, previewSample)
		};
	}
}
