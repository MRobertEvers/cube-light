import { phaseForOverall } from '../../../domain/scans/scan-progress';
import type { WorkItem } from 'src/domain/models/work';
import type { ImageScanTask } from '../../../domain/scans/image-scan-task';
import { useImageImportQueue } from './use-image-import-queue';
import { useWorkQueue } from './use-work-queue';
import { isOpenWork } from '../../../domain/models/work';

export function isScanActive(task: ImageScanTask): boolean {
	return task.status !== 'completed' && task.status !== 'error';
}

/** One line on where a queued item stands. `local` is this tab's scan of it, if any. */
export function workStatusText(item: WorkItem, local?: ImageScanTask): string {
	switch (item.status) {
		case 'pending':
			return 'Waiting for a computer';
		case 'running':
			if (local) {
				if (local.status === 'scanning')
					return local.phaseLabel || 'Scanning here';
				if (local.status === 'adding') return 'Adding identified cards';
				return 'Starting the scan here';
			}
			return item.progress.total > 0
				? `${phaseForOverall(item.pipeline ?? 'card-aware', item.progress.completed, item.progress.total)} on a computer · ${Math.round((item.progress.completed / item.progress.total) * 100)}%`
				: 'Starting on a computer';
		case 'completed':
			return item.cardsAdded === 1
				? '1 card added'
				: `${item.cardsAdded} cards added`;
		case 'failed':
			return 'Scan failed';
	}
}

/** 0–1 while scanning, or null when there's no region count to show yet. */
export function workProgress(
	item: WorkItem,
	local?: ImageScanTask
): number | null {
	if (item.status !== 'running' || local?.progressIndeterminate) return null;
	const { completed, total } = local ?? item.progress;
	return total > 0 ? completed / total : null;
}

const relativeTime = new Intl.RelativeTimeFormat(undefined, {
	numeric: 'auto'
});

export function timeAgo(iso: string): string {
	const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
	const steps: Array<[Intl.RelativeTimeFormatUnit, number]> = [
		['second', 60],
		['minute', 60],
		['hour', 24],
		['day', 7],
		['week', 4.35],
		['month', 12],
		['year', Infinity]
	];
	let value = seconds;
	for (const [unit, size] of steps) {
		if (Math.abs(value) < size) {
			return unit === 'second' && Math.abs(value) < 45
				? 'just now'
				: relativeTime.format(Math.round(value), unit);
		}
		value /= size;
	}
	return '';
}

/** `open` still needs attention; `total` also counts finished items not yet dismissed. */
export function useWorkCounts(): { open: number; total: number } {
	const { items } = useWorkQueue();
	const scans = useImageImportQueue().filter((task) => !task.workId);
	return {
		open:
			(items ?? []).filter(isOpenWork).length +
			scans.filter(isScanActive).length,
		total: (items ?? []).length + scans.length
	};
}
