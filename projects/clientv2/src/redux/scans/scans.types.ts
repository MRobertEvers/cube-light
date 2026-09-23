import type { ImageScanTask } from '../../domain/scans/image-scan-task';
import type { WorkItem } from '../../domain/models/work';

export type ScansState = {
	/** Photos being scanned on this device. */
	scans: ImageScanTask[];
	/** Photos queued for a desktop. Null until the first read. */
	workItems: WorkItem[] | null;
	workError: boolean;
};

