import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEvent, canonicalJson, decide, preview } from '../dist/index.js';

const id = 'deck_abcdefghijklmnop';
const at = '2026-09-22T00:00:00.000Z';

test('checkbook events reconstruct quantities and preserve the original state', () => {
    const opening = applyEvent(null, { type: 'DeckCreated', name: 'Ledger' }, id, at);
    const commands = [
        { type: 'deck.cards', id, edits: [{ uuid: 'printing-a', action: 'add', count: 2 }] },
        { type: 'deck.cards', id, edits: [{ uuid: 'printing-a', action: 'set', count: 5 }] },
        { type: 'deck.cards', id, edits: [{ uuid: 'printing-a', action: 'remove', count: 1 }] }
    ];
    let state = opening;
    const ledger = [];
    for (const command of commands) {
        const events = decide(state, command);
        ledger.push(...events);
        state = events.reduce((current, event) => applyEvent(current, event, id, at), state);
    }
    assert.equal(state.cards['printing-a'], 4);
    assert.deepEqual(opening.cards, {});
    assert.equal(ledger[1].changes[0].delta, 3);
    assert.deepEqual(ledger.reduce((current, event) => applyEvent(current, event, id, at), opening), state);
    assert.throws(() => applyEvent(state, ledger[0], id, at), /balance/);
});

test('a deleted aggregate cannot be silently resurrected by a pending edit', () => {
    const opening = applyEvent(null, { type: 'DeckCreated', name: 'Deleted' }, id, at);
    const deleted = preview(opening, { type: 'deck.delete', id }, at);
    assert.throws(() => preview(deleted, { type: 'deck.details', id, name: 'Local' }, at), /deleted/);
});

test('canonical hashing input ignores insertion order and rejects undefined durable values', () => {
    assert.equal(canonicalJson({ b: 2, a: { y: 1, x: 0 } }), canonicalJson({ a: { x: 0, y: 1 }, b: 2 }));
    assert.throws(() => canonicalJson({ missing: undefined }), /Undefined/);
});

test('main and side boards keep separate quantities for the same printing', () => {
    let state = applyEvent(null, { type: 'DeckCreated', name: 'Boards' }, id, at);
    state = preview(state, { type: 'deck.cards', id, edits: [{ uuid: 'printing-a', action: 'add', count: 3 }, { uuid: 'printing-a', action: 'add', count: 2, board: 'side' }] }, at);
    assert.deepEqual(state.cards, { 'printing-a': 3 });
    assert.deepEqual(state.sideboard, { 'printing-a': 2 });
    state = preview(state, { type: 'deck.cards', id, edits: [{ uuid: 'printing-a', action: 'set', count: 0, board: 'side' }] }, at);
    assert.deepEqual(state.cards, { 'printing-a': 3 });
    assert.equal('sideboard' in state, false, 'an emptied side board is stored as absent');
});

test('main-board edits record the same event shape as before boards existed', () => {
    const state = applyEvent(null, { type: 'DeckCreated', name: 'Legacy' }, id, at);
    const [event] = decide(state, { type: 'deck.cards', id, edits: [{ uuid: 'printing-a', action: 'add', count: 1, board: 'main' }] });
    assert.deepEqual(event, { type: 'CardQuantitiesAdjusted', changes: [{ uuid: 'printing-a', previous: 0, delta: 1, resulting: 1 }] });
    assert.equal('sideboard' in applyEvent(state, event, id, at), false);
});

test('moving a card between boards is one balanced event', () => {
    let state = applyEvent(null, { type: 'DeckCreated', name: 'Move' }, id, at);
    state = preview(state, { type: 'deck.cards', id, edits: [{ uuid: 'printing-a', action: 'add', count: 4 }] }, at);
    const events = decide(state, { type: 'deck.cards', id, edits: [{ uuid: 'printing-a', action: 'remove', count: 1 }, { uuid: 'printing-a', action: 'add', count: 1, board: 'side' }] });
    assert.equal(events.length, 1);
    assert.deepEqual(events[0].changes.map((change) => [change.board ?? 'main', change.delta]), [['main', -1], ['side', 1]]);
    const moved = applyEvent(state, events[0], id, at);
    assert.deepEqual([moved.cards, moved.sideboard], [{ 'printing-a': 3 }, { 'printing-a': 1 }]);
    assert.throws(() => applyEvent(moved, events[0], id, at), /balance/);
});

test('unknown boards are rejected', () => {
    const state = applyEvent(null, { type: 'DeckCreated', name: 'Boards' }, id, at);
    assert.throws(() => decide(state, { type: 'deck.cards', id, edits: [{ uuid: 'printing-a', action: 'add', count: 1, board: 'maybe' }] }), /board/);
    assert.throws(() => applyEvent(state, { type: 'CardQuantitiesAdjusted', changes: [{ uuid: 'printing-a', previous: 0, delta: 1, resulting: 1, board: 'maybe' }] }, id, at), /board/);
});

test('deck notes can be written, edited and deleted without changing an empty deck hash', () => {
    const opening = applyEvent(null, { type: 'DeckCreated', name: 'Notes' }, id, at);
    const noteId = 'note_abcdefghijklmnop';
    let state = preview(opening, { type: 'deck.note', id, noteId, text: 'Side in removal vs aggro' }, at);
    assert.equal(state.notes[noteId].text, 'Side in removal vs aggro');
    const later = '2026-09-23T00:00:00.000Z';
    state = preview(state, { type: 'deck.note', id, noteId, text: 'Edited' }, later);
    assert.deepEqual(state.notes[noteId], { text: 'Edited', createdAt: at, updatedAt: later });
    assert.deepEqual(decide(state, { type: 'deck.note', id, noteId, text: 'Edited' }), []);
    assert.throws(() => decide(state, { type: 'deck.note', id, noteId, text: '  ' }), /Enter a note/);
    assert.throws(() => decide(state, { type: 'deck.note', id, noteId: 'bad', text: 'x' }), /note ID/);
    state = preview(state, { type: 'deck.noteDelete', id, noteId }, later);
    assert.equal('notes' in state, false, 'a deck without notes stores none');
    assert.deepEqual(decide(state, { type: 'deck.noteDelete', id, noteId }), []);
});

test('a deck keeps its board visualization without changing the hash of decks that never chose one', () => {
    const opening = applyEvent(null, { type: 'DeckCreated', name: 'Boards' }, id, at);
    assert.equal('boardVisualization' in opening, false);
    const state = preview(opening, { type: 'deck.visualization', id, boardVisualization: 'mtg-arena-table' }, at);
    assert.equal(state.boardVisualization, 'mtg-arena-table');
    assert.deepEqual(decide(state, { type: 'deck.visualization', id, boardVisualization: 'mtg-arena-table' }), []);
    assert.throws(() => decide(state, { type: 'deck.visualization', id, boardVisualization: 'Not An Id' }), /Invalid board visualization/);
});
