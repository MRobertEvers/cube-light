export type CardImagePipeline = 'card-aware' | 'paddle-only';
export const DEFAULT_IMAGE_PIPELINE: CardImagePipeline = 'card-aware';
export const IMAGE_PIPELINES = [
	{
		value: 'card-aware' as const,
		label: 'Card-aware · recommended',
		description: 'Finds small and angled titles, then checks names with the compact Paddle verifier.'
	},
	{
		value: 'paddle-only' as const,
		label: 'PaddleOCR · text only',
		description: 'Text detection and recognition only. Faster, but may miss blurred or overlapping titles.'
	}
];
export function isCardImagePipeline(value: unknown): value is CardImagePipeline {
	return value === 'card-aware' || value === 'paddle-only';
}
