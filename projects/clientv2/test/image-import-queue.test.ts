import test from 'node:test';
import assert from 'node:assert/strict';
import { ImageImportQueue, type ImageScanRunner } from '../src/engine/jobs/image-import-queue';
import { EngineEvents } from '../src/engine/events';
import type { ImageScanTask } from '../src/domain/scans/image-scan-task';

/** A queue whose scanner fails or finishes each run as `outcomes` says, in order. */
function queue(outcomes: Array<'fail' | 'finish'>) {
	const events = new EngineEvents();
	let scans: ImageScanTask[] = [];
	events.subscribe((event) => {
		if (event.type === 'scans-changed') scans = event.scans;
	});
	const scanner = {
		scan: async () => {
			if (outcomes.shift() === 'fail') throw new Error('No reliable plane reference');
			return { layout: 'list' as const, candidates: [], width: 1, height: 1 };
		}
	};
	const cards = { allNames: async () => [] as string[] };
	const imports = new ImageImportQueue({} as never, cards as never, scanner as never, events);
	return { imports, scans: () => scans };
}

function runner(workId: string): ImageScanRunner {
	return {
		workId,
		progress: () => undefined,
		commit: async () => undefined,
		fail: () => undefined,
		isLost: () => false,
		finished: () => undefined
	};
}

async function settled(scans: () => ImageScanTask[]): Promise<void> {
	for (let waited = 0; waited < 2000; waited += 5) {
		if (scans().every((scan) => scan.status === 'completed' || scan.status === 'error')) return;
		await new Promise((resolve) => setTimeout(resolve, 5));
	}
	throw new Error('The scans did not finish');
}

const photo = new File(['jpeg'], 'list.jpeg', { type: 'image/jpeg' });

test('a queued item scanned again replaces its earlier failed run on this device', async () => {
	const { imports, scans } = queue(['fail', 'finish']);
	imports.enqueue('deck_rC_J6G_hgZvoWdtQ', photo, runner('work_Tg_UXmRcvZDKPgKV'));
	await settled(scans);
	assert.deepEqual(scans().map((scan) => [scan.status, scan.error]), [['error', 'No reliable plane reference']]);

	imports.enqueue('deck_rC_J6G_hgZvoWdtQ', photo, runner('work_Tg_UXmRcvZDKPgKV'));
	await settled(scans);
	// Only the retry is left: no "needs attention" beside the finished scan.
	assert.deepEqual(scans().map((scan) => [scan.workId, scan.status]), [['work_Tg_UXmRcvZDKPgKV', 'completed']]);
});

test('failures of other items, and of photos scanned here, stay until dismissed', async () => {
	const { imports, scans } = queue(['fail', 'fail', 'finish']);
	imports.enqueue('deck_TZY1oKetwV7B0-XW', photo, runner('work_KPKefinbN2NVREsd'));
	imports.enqueue('deck_TZY1oKetwV7B0-XW', photo);
	await settled(scans);
	imports.enqueue('deck_rC_J6G_hgZvoWdtQ', photo, runner('work_Tg_UXmRcvZDKPgKV'));
	await settled(scans);
	assert.deepEqual(scans().map((scan) => [scan.workId, scan.status]), [
		['work_KPKefinbN2NVREsd', 'error'],
		[null, 'error'],
		['work_Tg_UXmRcvZDKPgKV', 'completed']
	]);
});
