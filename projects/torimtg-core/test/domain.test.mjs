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
