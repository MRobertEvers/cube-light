import { useEffect, useState } from 'react';

export type CardPalette = {
	accent: string;
	surface: string;
	wash: string;
	border: string;
};

export const DEFAULT_CARD_PALETTE: CardPalette = {
	accent: '#403b3b',
	surface: '#f2efed',
	wash: '#fafafa',
	border: '#e5e1df'
};

function hexChannels(color: string): number[] {
	return [1, 3, 5].map((index) =>
		parseInt(color.slice(index, index + 2), 16)
	);
}

function channelLuminance(value: number): number {
	const channel = value / 255;
	return channel <= 0.04045
		? channel / 12.92
		: ((channel + 0.055) / 1.055) ** 2.4;
}

function colorLuminance(color: string): number {
	const [red, green, blue] = hexChannels(color);
	return (
		0.2126 * channelLuminance(red) +
		0.7152 * channelLuminance(green) +
		0.0722 * channelLuminance(blue)
	);
}

function contrastRatio(first: string, second: string): number {
	const values = [colorLuminance(first), colorLuminance(second)].sort(
		(a, b) => b - a
	);
	return (values[0] + 0.05) / (values[1] + 0.05);
}

export function readableAccent(accent: string, background: string): string {
	if (contrastRatio(accent, background) >= 4.5) return accent;
	const channels = hexChannels(accent);
	const target = colorLuminance(background) > 0.18 ? 0 : 255;
	for (let amount = 0.05; amount <= 1.001; amount += 0.05) {
		const candidate = `#${channels
			.map((channel) =>
				Math.round(channel * (1 - amount) + target * amount)
					.toString(16)
					.padStart(2, '0')
			)
			.join('')}`;
		if (contrastRatio(candidate, background) >= 4.5) return candidate;
	}
	return target === 0 ? '#000000' : '#ffffff';
}

export function onAccent(accent: string): string {
	return colorLuminance(accent) > 0.18 ? '#000000' : '#ffffff';
}

const paletteCache = new Map<string, CardPalette>();
const SAMPLE_SIZE = 40;
const HUE_BUCKETS = 24;

function rgbToHsl(red: number, green: number, blue: number) {
	const r = red / 255;
	const g = green / 255;
	const b = blue / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const difference = max - min;
	const lightness = (max + min) / 2;
	if (difference === 0) return { hue: 0, saturation: 0, lightness };

	const saturation = difference / (1 - Math.abs(2 * lightness - 1));
	let hue = 0;
	if (max === r) hue = ((g - b) / difference) % 6;
	else if (max === g) hue = (b - r) / difference + 2;
	else hue = (r - g) / difference + 4;
	return { hue: (hue * 60 + 360) % 360, saturation, lightness };
}

function hslColor(hue: number, saturation: number, lightness: number) {
	const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
	const section = hue / 60;
	const secondary = chroma * (1 - Math.abs((section % 2) - 1));
	const match = lightness - chroma / 2;
	const channels =
		section < 1
			? [chroma, secondary, 0]
			: section < 2
				? [secondary, chroma, 0]
				: section < 3
					? [0, chroma, secondary]
					: section < 4
						? [0, secondary, chroma]
						: section < 5
							? [secondary, 0, chroma]
							: [chroma, 0, secondary];
	return `#${channels
		.map((channel) =>
			Math.round((channel + match) * 255)
				.toString(16)
				.padStart(2, '0')
		)
		.join('')}`;
}

function accentContrast(hue: number, saturation: number, lightness: number) {
	const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
	const section = hue / 60;
	const secondary = chroma * (1 - Math.abs((section % 2) - 1));
	const match = lightness - chroma / 2;
	const channels =
		section < 1
			? [chroma, secondary, 0]
			: section < 2
				? [secondary, chroma, 0]
				: section < 3
					? [0, chroma, secondary]
					: section < 4
						? [0, secondary, chroma]
						: section < 5
							? [secondary, 0, chroma]
							: [chroma, 0, secondary];
	const luminance = channels.reduce((sum, channel, index) => {
		const value = channel + match;
		const linear =
			value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
		return sum + linear * [0.2126, 0.7152, 0.0722][index];
	}, 0);
	return 1.05 / (luminance + 0.05);
}

function extractPalette(image: HTMLImageElement): CardPalette | null {
	const canvas = document.createElement('canvas');
	canvas.width = SAMPLE_SIZE;
	canvas.height = SAMPLE_SIZE;
	const context = canvas.getContext('2d', { willReadFrequently: true });
	if (!context) return null;

	try {
		context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
		const pixels = context.getImageData(
			0,
			0,
			SAMPLE_SIZE,
			SAMPLE_SIZE
		).data;
		const buckets = Array.from({ length: HUE_BUCKETS }, () => ({
			weight: 0,
			count: 0,
			x: 0,
			y: 0,
			saturation: 0,
			lightness: 0
		}));
		for (let index = 0; index < pixels.length; index += 4) {
			if (pixels[index + 3] < 128) continue;
			const { hue, saturation, lightness } = rgbToHsl(
				pixels[index],
				pixels[index + 1],
				pixels[index + 2]
			);
			if (saturation < 0.16 || lightness < 0.1 || lightness > 0.9)
				continue;
			const weight = saturation * (1 - 0.65 * Math.abs(lightness - 0.5));
			const bucket = buckets[Math.floor(hue / (360 / HUE_BUCKETS))];
			const angle = (hue * Math.PI) / 180;
			bucket.weight += weight;
			bucket.count++;
			bucket.x += Math.cos(angle) * weight;
			bucket.y += Math.sin(angle) * weight;
			bucket.saturation += saturation * weight;
			bucket.lightness += lightness * weight;
		}

		function windowWeight(index: number) {
			return [-1, 0, 1].reduce(
				(sum, offset) =>
					sum +
					buckets[(index + offset + HUE_BUCKETS) % HUE_BUCKETS]
						.weight,
				0
			);
		}
		function windowCount(index: number) {
			return [-1, 0, 1].reduce(
				(sum, offset) =>
					sum +
					buckets[(index + offset + HUE_BUCKETS) % HUE_BUCKETS].count,
				0
			);
		}
		let best = -1;
		let bestWeight = 0;
		for (let index = 0; index < HUE_BUCKETS; index++) {
			const weight = windowWeight(index);
			if (weight > bestWeight) {
				best = index;
				bestWeight = weight;
			}
		}
		if (best < 0) return null;

		function summarize(index: number) {
			const neighbors = [-1, 0, 1].map(
				(offset) =>
					buckets[(index + offset + HUE_BUCKETS) % HUE_BUCKETS]
			);
			const totals = neighbors.reduce(
				(sum, bucket) => ({
					weight: sum.weight + bucket.weight,
					x: sum.x + bucket.x,
					y: sum.y + bucket.y,
					saturation: sum.saturation + bucket.saturation,
					lightness: sum.lightness + bucket.lightness
				}),
				{ weight: 0, x: 0, y: 0, saturation: 0, lightness: 0 }
			);
			return {
				hue:
					((Math.atan2(totals.y, totals.x) * 180) / Math.PI + 360) %
					360,
				saturation: totals.saturation / totals.weight,
				lightness: totals.lightness / totals.weight
			};
		}
		function distanceFromDominant(index: number) {
			return (
				(Math.min(
					Math.abs(index - best),
					HUE_BUCKETS - Math.abs(index - best)
				) *
					360) /
				HUE_BUCKETS
			);
		}

		// A contrasting accent must also be colorful enough to stand out. Otherwise
		// muted scenery can displace a more characteristic subject color.
		let accentBucket = best;
		let accentWeight = 0;
		for (let index = 0; index < HUE_BUCKETS; index++) {
			const weight = windowWeight(index);
			if (
				distanceFromDominant(index) < 80 ||
				weight < bestWeight * 0.12 ||
				windowCount(index) < SAMPLE_SIZE * SAMPLE_SIZE * 0.025 ||
				summarize(index).saturation < 0.26
			)
				continue;
			if (weight > accentWeight) {
				accentBucket = index;
				accentWeight = weight;
			}
		}

		// When the accent is the dominant hue, use a separate substantial hue for
		// the quieter surfaces. This keeps multi-colored artwork from becoming monochrome.
		let surfaceBucket = best;
		if (accentBucket === best) {
			let surfaceWeight = 0;
			for (let index = 0; index < HUE_BUCKETS; index++) {
				const weight = windowWeight(index);
				if (
					distanceFromDominant(index) < 50 ||
					weight < bestWeight * 0.1 ||
					windowCount(index) < SAMPLE_SIZE * SAMPLE_SIZE * 0.025
				)
					continue;
				if (weight > surfaceWeight) {
					surfaceBucket = index;
					surfaceWeight = weight;
				}
			}
		}
		const accent = summarize(accentBucket);
		const surface = summarize(surfaceBucket);
		const hue = accent.hue;
		const saturation = Math.min(
			0.75,
			Math.max(0.45, accent.saturation * 1.3)
		);
		let accentLightness = Math.min(
			0.42,
			Math.max(0.32, 0.35 + (accent.lightness - 0.4) * 0.15)
		);
		while (accentContrast(hue, saturation, accentLightness) < 5.6)
			accentLightness -= 0.01;

		return {
			accent: hslColor(hue, saturation, accentLightness),
			surface: hslColor(
				surface.hue,
				Math.min(0.5, Math.max(0.22, surface.saturation * 0.9)),
				0.87
			),
			wash: hslColor(
				surface.hue,
				Math.min(0.32, Math.max(0.14, surface.saturation * 0.65)),
				0.95
			),
			border: hslColor(
				surface.hue,
				Math.min(0.45, Math.max(0.18, surface.saturation * 0.8)),
				0.76
			)
		};
	} catch {
		// A remote image without canvas CORS support should leave the normal theme intact.
		return null;
	}
}

export function useCardPalette(
	imageUrl: string | null | undefined
): CardPalette | null {
	const [result, setResult] = useState<{
		url: string;
		palette: CardPalette | null;
	} | null>(null);

	useEffect(() => {
		if (!imageUrl) return;
		if (paletteCache.has(imageUrl)) {
			setResult({
				url: imageUrl,
				palette: paletteCache.get(imageUrl) ?? null
			});
			return;
		}

		let active = true;
		const image = new Image();
		image.crossOrigin = 'anonymous';
		image.onload = function () {
			const palette = extractPalette(image);
			if (palette) paletteCache.set(imageUrl, palette);
			if (active) setResult({ url: imageUrl, palette });
		};
		image.onerror = function () {
			if (active) setResult({ url: imageUrl, palette: null });
		};
		image.src = imageUrl;
		return function () {
			active = false;
			image.onload = null;
			image.onerror = null;
		};
	}, [imageUrl]);

	return result && result.url === imageUrl ? result.palette : null;
}
