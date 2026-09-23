import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	deserializeHistoryModal,
	findHistoryModal,
	serializeHistoryModal
} from '../src/redux/history-modal/history-modal.browser-state';
import { historyModalSlice, restoreHistoryModal } from '../src/redux/history-modal/historyModalSlice';

test('serializes a modal without discarding other router state', () => {
	const entry = {
		scope: 'deck:12',
		value: { type: 'card-preview', uuid: 'card-3' },
		parent: null
	};
	const state = serializeHistoryModal({ returnTo: '/decks' }, entry);

	assert.equal(state.returnTo, '/decks');
	assert.deepEqual(deserializeHistoryModal(state), entry);
});

test('restores a serialized modal into Redux', () => {
	const entry = {
		scope: 'home',
		value: { type: 'new-deck' },
		parent: null
	};
	const state = historyModalSlice.reducer(
		undefined,
		restoreHistoryModal(entry)
	);

	assert.deepEqual(state.entry, entry);
	assert.equal(
		historyModalSlice.reducer(state, restoreHistoryModal(null)).entry,
		null
	);
});

test('round-trips a nested modal with its parent dialog', () => {
	const entry = {
		scope: 'add-cards-printing',
		value: { line: 4, name: 'Sol Ring' },
		parent: {
			scope: 'deck:12',
			value: { type: 'add-cards' },
			parent: null
		}
	};

	assert.deepEqual(
		deserializeHistoryModal(serializeHistoryModal({}, entry)),
		entry
	);
	assert.deepEqual(findHistoryModal(entry, 'deck:12'), entry.parent);
});

test('ignores unrelated or malformed browser state', () => {
	assert.equal(deserializeHistoryModal(null), null);
	assert.equal(deserializeHistoryModal({ other: true }), null);
	assert.equal(
		deserializeHistoryModal({ __cubeLightModal: { value: true } }),
		null
	);
});
