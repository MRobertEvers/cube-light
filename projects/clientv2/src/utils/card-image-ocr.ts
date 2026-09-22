import { progressFor } from './scan-progress';
/** Browser-only scanner shared with the 12/12 tabletop benchmark. */
export type ImageRegion = {
	x: number;
	y: number;
	width: number;
	height: number;
};
export type CardImageCandidate = {
	name: string;
	text: string;
	score: number;
	box: ImageRegion;
};
export type ScanProgress = {
	phase: 'loading' | 'scanning';
	completed: number;
	total: number;
	region: ImageRegion | null;
	candidates: CardImageCandidate[];
	message?: string;
	indeterminate?: boolean;
};
type PipelineCandidate = {
	name: string;
	text: string;
	status: string;
	similarity?: number;
	score?: number;
	evidence?: { opticalScore?: number };
	box: { x: number; y: number; w: number; h: number };
};
type PipelineEvent = {
	phase: string;
	completed?: number;
	total?: number;
	region?: { x: number; y: number; w: number; h: number };
};
import type { CardImagePipeline } from './image-scan-pipelines';
export type ScanOptions = { pipeline?: CardImagePipeline };

type PipelineOptions = {
	pipeline?: CardImagePipeline;
	url: string;
	names: string[];
	isCancelled: () => boolean;
	onProgress: (event: PipelineEvent) => void;
	onStage: (
		stage: string,
		data: { candidates?: PipelineCandidate[] }
	) => Promise<void>;
};
type PipelineResult = { candidates: PipelineCandidate[]; totalMs: number };
function convert(candidates: PipelineCandidate[]): CardImageCandidate[] {
	return candidates
		.filter((c) => c.status === 'accepted')
		.map((c) => ({
			name: c.name,
			text: c.text,
			score:
				100 *
				(c.similarity ?? c.score ?? c.evidence?.opticalScore ?? 0),
			box: { x: c.box.x, y: c.box.y, width: c.box.w, height: c.box.h }
		}));
}
export async function scanCardImage(
	file: File,
	names: string[],
	onProgress: (progress: ScanProgress) => void,
	isCancelled: () => boolean,
	optionsArg?: ScanOptions
): Promise<{
	candidates: CardImageCandidate[];
	width: number;
	height: number;
}> {
	const options = optionsArg === undefined ? {} : optionsArg;

	let candidates: CardImageCandidate[] = [],
		completed = 0,
		message = 'Loading card scanner',
		indeterminate = true;
	onProgress({
		phase: 'loading',
		completed: 0,
		total: 100,
		region: null,
		candidates,
		message: 'Loading card scanner',
		indeterminate: true
	});
	const image = await createImageBitmap(file),
		width = image.width,
		height = image.height;
	image.close();
	const url = URL.createObjectURL(file);
	try {
		const module =
			await import('../lib/card-scanner/experimental-scanner.js');
		const scan = module.scanExperimental as unknown as (
			options: PipelineOptions
		) => Promise<PipelineResult>;
		const result = await scan({
			pipeline: options.pipeline ?? 'card-aware',
			url,
			names,
			isCancelled,
			onProgress: function (event) {
				const update = progressFor(
					options.pipeline ?? 'card-aware',
					event,
					completed
				);
				completed = update.completed;
				message = update.message;
				indeterminate = update.indeterminate;
				const r = event.region;
				onProgress({
					phase: 'scanning',
					completed,
					total: 100,
					region: r
						? { x: r.x, y: r.y, width: r.w, height: r.h }
						: null,
					candidates: [...candidates],
					message,
					indeterminate
				});
			},
			onStage: async function (_stage, data) {
				if (data.candidates) candidates = convert(data.candidates);
				onProgress({
					phase: 'scanning',
					completed,
					total: 100,
					region: null,
					candidates: [...candidates],
					message,
					indeterminate
				});
			}
		});
		candidates = convert(result.candidates);
		onProgress({
			phase: 'scanning',
			completed: 99,
			total: 100,
			region: null,
			candidates,
			message: 'Finishing analysis',
			indeterminate: false
		});
		return { candidates, width, height };
	} finally {
		URL.revokeObjectURL(url);
	}
}
