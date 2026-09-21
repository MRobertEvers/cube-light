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
type PipelineOptions = {
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
const stages: Record<string, [number, number]> = {
	'Read visible titles': [0, 24],
	'Title proposals: light': [24, 36],
	'Title proposals: ink': [36, 57],
	'Title proposals: plane': [57, 72],
	'Refine printed-name matches': [72, 78],
	'Load printed titles': [78, 82],
	'Verify ambiguous names': [82, 99]
};
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
	isCancelled: () => boolean
): Promise<{
	candidates: CardImageCandidate[];
	width: number;
	height: number;
}> {
	let candidates: CardImageCandidate[] = [],
		completed = 0;
	onProgress({
		phase: 'loading',
		completed: 0,
		total: 100,
		region: null,
		candidates,
		message: 'Loading card scanner'
	});
	const image = await createImageBitmap(file),
		width = image.width,
		height = image.height;
	image.close();
	const url = URL.createObjectURL(file);
	try {
		const module = await import(
			'../lib/card-scanner/experimental-scanner.js'
		);
		const scan = module.scanExperimental as unknown as (
			options: PipelineOptions
		) => Promise<PipelineResult>;
		const result = await scan({
			url,
			names,
			isCancelled,
			onProgress: (event) => {
				const [start, end] = stages[event.phase] ?? [
					completed,
					completed
				];
				const ratio = event.total
					? Math.min(1, (event.completed ?? 0) / event.total)
					: 0;
				completed = Math.max(
					completed,
					Math.floor(start + (end - start) * ratio)
				);
				const r = event.region;
				onProgress({
					phase: 'scanning',
					completed,
					total: 100,
					region: r
						? { x: r.x, y: r.y, width: r.w, height: r.h }
						: null,
					candidates: [...candidates],
					message: event.phase
				});
			},
			onStage: async (_stage, data) => {
				if (data.candidates) candidates = convert(data.candidates);
				onProgress({
					phase: 'scanning',
					completed,
					total: 100,
					region: null,
					candidates: [...candidates],
					message: 'Reviewing identified names'
				});
			}
		});
		candidates = convert(result.candidates);
		onProgress({
			phase: 'scanning',
			completed: 100,
			total: 100,
			region: null,
			candidates,
			message: 'Scan complete'
		});
		return { candidates, width, height };
	} finally {
		URL.revokeObjectURL(url);
	}
}
