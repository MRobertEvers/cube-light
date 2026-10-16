import { progressFor } from '../../domain/scans/scan-progress';
import type { CardImageCandidate, ImageRegion, ImageScanLayout } from '../../domain/scans/scan-candidates';
/** Browser-only scanner shared with the 12/12 tabletop benchmark. */
export type ScanProgress = {
	phase: 'loading' | 'scanning';
	completed: number;
	total: number;
	region: ImageRegion | null;
	layout: ImageScanLayout | null;
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
	/** The count read beside a list line; absent on card titles. */
	count?: { value: number } | null;
};
type PipelineEvent = {
	phase: string;
	completed?: number;
	total?: number;
	region?: { x: number; y: number; w: number; h: number };
};
import type { CardImagePipeline } from '../../domain/scans/image-scan-pipelines';
export type ScanOptions = { pipeline?: CardImagePipeline };

type PipelineOptions = {
	pipeline?: CardImagePipeline;
	url: string;
	names: string[];
	isCancelled: () => boolean;
	onProgress: (event: PipelineEvent) => void;
	onStage: (
		stage: string,
		data: { candidates?: PipelineCandidate[]; layout?: ImageScanLayout }
	) => Promise<void>;
};
type PipelineResult = {
	candidates: PipelineCandidate[];
	layout: ImageScanLayout;
	totalMs: number;
};
function convert(
	candidates: PipelineCandidate[],
	layout: ImageScanLayout | null
): CardImageCandidate[] {
	return candidates
		.filter((c) => c.status === 'accepted')
		.map((c): CardImageCandidate => {
			const score =
					100 *
					(c.similarity ?? c.score ?? c.evidence?.opticalScore ?? 0),
				box = { x: c.box.x, y: c.box.y, width: c.box.w, height: c.box.h };
			return layout === 'list'
				? {
						source: 'list-line',
						name: c.name,
						text: c.text,
						score,
						box,
						count: c.count?.value ?? 1
					}
				: { source: 'card-title', name: c.name, text: c.text, score, box };
		});
}
export async function scanCardImage(
	file: File,
	names: string[],
	onProgress: (progress: ScanProgress) => void,
	isCancelled: () => boolean,
	optionsArg?: ScanOptions
): Promise<{
	layout: ImageScanLayout;
	candidates: CardImageCandidate[];
	width: number;
	height: number;
}> {
	const options = optionsArg === undefined ? {} : optionsArg;

	let candidates: CardImageCandidate[] = [],
		layout: ImageScanLayout | null = null,
		completed = 0,
		message = 'Loading card scanner',
		indeterminate = true;
	onProgress({
		phase: 'loading',
		completed: 0,
		total: 100,
		region: null,
		layout,
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
			await import('./experimental-scanner.js');
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
					layout,
					candidates: candidates.slice(),
					message,
					indeterminate
				});
			},
			onStage: async function (_stage, data) {
				if (data.layout) layout = data.layout;
				if (data.candidates) candidates = convert(data.candidates, layout);
				onProgress({
					phase: 'scanning',
					completed,
					total: 100,
					region: null,
					layout,
					candidates: candidates.slice(),
					message,
					indeterminate
				});
			}
		});
		layout = result.layout;
		candidates = convert(result.candidates, layout);
		onProgress({
			phase: 'scanning',
			completed: 99,
			total: 100,
			region: null,
			layout,
			candidates,
			message: 'Finishing analysis',
			indeterminate: false
		});
		return { layout, candidates, width, height };
	} finally {
		URL.revokeObjectURL(url);
	}
}
