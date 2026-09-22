import type { CardImagePipeline } from './image-scan-pipelines';

export type ScanEvent = {
	phase: string;
	completed?: number;
	total?: number;
};
type Stage = [number, number, string];
const cardStages: Record<string, Stage> = {
	'Prepare text reader': [0, 5, 'Loading text models'],
	'Read visible titles': [5, 25, 'Reading text'],
	'Build title index: light': [25, 28, 'Indexing card names · pass 1/3'],
	'Title proposals: light': [28, 38, 'Finding titles · pass 1/3'],
	'Build title index: ink': [38, 41, 'Indexing card names · pass 2/3'],
	'Title proposals: ink': [41, 58, 'Finding titles · pass 2/3'],
	'Build title index: plane': [58, 62, 'Indexing card names · pass 3/3'],
	'Straighten card plane': [62, 63, 'Straightening card layout'],
	'Title proposals: plane': [63, 79, 'Finding titles · pass 3/3'],
	'Refine printed-name matches': [79, 87, 'Refining name matches'],
	'Load printed titles': [87, 90, 'Loading title references'],
	'Compare printed titles': [90, 93, 'Comparing title references'],
	'Prepare verifier': [93, 95, 'Loading the compact verifier'],
	'Verify ambiguous names': [95, 99, 'Verifying uncertain names']
};
const textStages: Record<string, Stage> = {
	'Prepare text reader': [0, 10, 'Loading text models'],
	'Read visible titles': [10, 99, 'Reading text']
};

/** Stage-weighted work progress; never an elapsed-time or download estimate. */
export function progressFor(
	pipeline: CardImagePipeline,
	event: ScanEvent,
	previousArg?: number
) {
	const previous = previousArg === undefined ? 0 : previousArg;
	const stages = pipeline === 'paddle-only' ? textStages : cardStages;
	const entry = stages[event.phase] ?? [previous, previous, event.phase];
	const total = event.total ?? 0;
	const known = total > 0;
	const done = Math.max(0, Math.min(event.completed ?? 0, total));
	const fraction = known ? done / total : 0;
	return {
		completed: Math.max(previous, Math.min(99,
			Math.floor(entry[0] + (entry[1] - entry[0]) * fraction))),
		message: entry[2] + (known ? ` · ${done} / ${total}` : ''),
		indeterminate: !known
	};
}

/** Remote viewers receive overall progress; the processing tab has exact events. */
export function phaseForOverall(
	pipeline: CardImagePipeline,
	completed: number,
	total: number
): string {
	if (total <= 0) return 'Preparing scan';
	const percent = Math.max(0, Math.min(100, completed / total * 100));
	if (percent >= 99) return 'Adding identified cards';
	const entries = Object.values(pipeline === 'paddle-only' ? textStages : cardStages);
	let label = entries[0][2];
	for (const [start, , name] of entries) {
		if (percent >= start) label = name;
	}
	return label;
}
