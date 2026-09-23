import test from 'node:test';
import assert from 'node:assert/strict';
import { applySteps, countEdits, printingCounts } from '../src/domain/deck/card-steps';

const deck = printingCounts([
    { uuid: 'a', count: 2 },
    { uuid: 'a', count: 1, board: 'side' },
    { uuid: 'b', count: 1, board: 'main' }
]);

test('steps taken before earlier ones save still add up', () => {
    const after = applySteps(deck, [
        { type: 'adjust', uuid: 'a', board: 'main', delta: 1 },
        { type: 'adjust', uuid: 'a', board: 'main', delta: 1 },
        { type: 'move', uuid: 'a', from: 'main', count: 1 }
    ]);
    assert.deepEqual(after.get('a'), { main: 3, side: 2 });
});

test('a step the deck no longer allows does as much as it can', () => {
    const after = applySteps(deck, [
        { type: 'move', uuid: 'b', from: 'side', count: 1 },
        { type: 'adjust', uuid: 'b', board: 'main', delta: -5 },
        { type: 'move', uuid: 'a', from: 'main', count: 99 }
    ]);
    assert.deepEqual(after.get('b'), { main: 0, side: 0 });
    assert.deepEqual(after.get('a'), { main: 0, side: 3 });
});

test('replacing a printing keeps each board’s count and saves as exact counts', () => {
    const after = applySteps(deck, [{ type: 'replace', from: 'a', to: 'b' }]);
    assert.deepEqual(after.get('b'), { main: 3, side: 1 });
    assert.deepEqual(countEdits(deck, after), [
        { uuid: 'a', action: 'set', count: 0 },
        { uuid: 'a', action: 'set', count: 0, board: 'side' },
        { uuid: 'b', action: 'set', count: 3 },
        { uuid: 'b', action: 'set', count: 1, board: 'side' }
    ]);
});
