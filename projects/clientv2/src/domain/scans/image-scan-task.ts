import type { CardImagePipeline } from './image-scan-pipelines';
import type { CardImageCandidate, ImageRegion } from './scan-candidates';

export type ImageScanStatus =
	'queued' | 'loading' | 'scanning' | 'adding' | 'completed' | 'error';

export type ImageScanTask = {
	id: string;
	deckId: string;
	imageUrl: string;
	fileName: string;
	pipeline: CardImagePipeline;
	status: ImageScanStatus;
	completed: number;
	total: number;
	region: ImageRegion | null;
	candidates: CardImageCandidate[];
	phaseLabel?: string;
	progressIndeterminate?: boolean;
	addedCounts: Record<string, number>;
	plannedCounts: Record<string, number>;
	error: string | null;
	/** Set when this scan is a phone's queued photo that this device picked up. */
	workId: string | null;
};
