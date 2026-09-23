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
