import { BANNER_BLEND_SIZES, type BannerBlendJob, type BannerBlendVariant } from './banner-blend';
import { blendBannerPixels } from './banner-blend-algorithms';

self.addEventListener('message', async (event: MessageEvent<BannerBlendJob>) => {
	let bitmap: ImageBitmap | null = null;
	try {
		const response = await fetch(event.data.src);
		if (!response.ok) throw new Error('Unable to load the banner artwork.');
		bitmap = await createImageBitmap(await response.blob());
		const { crop, config } = event.data;
		const images = {} as Record<BannerBlendVariant, string>;
		for (const variant of ['desktop', 'mobile', 'tile'] as const) {
			self.postMessage({ progress: `Rendering ${variant} banner…` });
			const [width, height] = BANNER_BLEND_SIZES[variant];
			const frame = variant === 'mobile' ? crop.mobile : crop.desktop;
			const artWidth = width * 0.78;
			const scale = Math.max(artWidth / bitmap.width, height / bitmap.height) * frame.zoom;
			const imageWidth = bitmap.width * scale, imageHeight = bitmap.height * scale;
			const left = (artWidth - imageWidth) * Math.min(frame.x, 1) - Math.max(0, frame.x - 1) * artWidth;
			const top = (height - imageHeight) * frame.y;
			const canvas = new OffscreenCanvas(width, height), context = canvas.getContext('2d');
			if (!context) throw new Error('Banner rendering is unavailable in this browser.');
			context.fillStyle = config.surface; context.fillRect(0, 0, width, height);
			context.save(); context.beginPath(); context.rect(0, 0, artWidth, height); context.clip();
			context.drawImage(bitmap, left, top, imageWidth, imageHeight); context.restore();
			const pixels = context.getImageData(0, 0, width, height);
			pixels.data.set(blendBannerPixels(pixels.data, width, height, config));
			context.putImageData(pixels, 0, 0);
			const bytes = new Uint8Array(await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer());
			let binary = '';
			for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
			images[variant] = btoa(binary);
		}
		self.postMessage({ images });
	} catch (error) {
		self.postMessage({ error: error instanceof Error ? error.message : 'Unable to render the banner.' });
	} finally { bitmap?.close(); }
});
