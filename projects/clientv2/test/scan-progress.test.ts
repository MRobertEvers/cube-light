import test from 'node:test';
import assert from 'node:assert/strict';
import { progressFor } from '../src/domain/scans/scan-progress';
test('loading is indeterminate and names the loading stage', () => {
	const p = progressFor('card-aware', { phase: 'Prepare verifier' }, 87);
	assert.equal(p.indeterminate, true);
	assert.equal(p.completed, 93);
	assert.match(p.message, /Loading the compact verifier/);
});
test('real work counts drive progress without backwards jumps', () => {
	const a = progressFor(
		'card-aware',
		{ phase: 'Verify ambiguous names', completed: 15, total: 17 },
		95
	);
	const b = progressFor(
		'card-aware',
		{ phase: 'Verify ambiguous names', completed: 16, total: 20 },
		a.completed
	);
	assert.ok(b.completed >= a.completed);
	assert.match(b.message, /16 \/ 20/);
});
test('recognition does not claim completion before cards are added', () => {
	assert.equal(
		progressFor(
			'card-aware',
			{ phase: 'Verify ambiguous names', completed: 17, total: 17 },
			95
		).completed,
		99
	);
	assert.equal(
		progressFor('paddle-only', {
			phase: 'Read visible titles',
			completed: 48,
			total: 48
		}).completed,
		99
	);
});
