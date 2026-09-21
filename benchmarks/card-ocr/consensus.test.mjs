import test from "node:test";
import assert from "node:assert/strict";
import { addTextConsensus } from "./consensus.js";
const poly = [
    [0, 0],
    [200, 0],
    [200, 20],
    [0, 20],
  ],
  other = [
    [400, 0],
    [600, 0],
    [600, 20],
    [400, 20],
  ];
const optical = [{ poly, candidates: [{ name: "Example Card", score: 0.7 }] }];
const row = (name = "Example Card", support = 0.06, gap = 0.4, p = poly) => ({
  poly: p,
  result: { ranked: [{ name, rawTokenSupport: support }], searchGap: gap },
});
test("agreement at another location cannot validate a title", () =>
  assert.equal(
    addTextConsensus([], [row("Example Card", 0.06, 0.4, other)], optical)
      .length,
    0,
  ));
test("disagreement or weak evidence remains unaccepted", () => {
  for (const r of [
    row("Different Card"),
    row("Example Card", 0.001),
    row("Example Card", 0.06, 0.01),
  ])
    assert.equal(addTextConsensus([], [r], optical).length, 0);
});
test("repeated observations count a title once", () =>
  assert.equal(addTextConsensus([], [row(), row()], optical).length, 1));
test("a short suffix cannot be promoted to a separate card identity", () => {
  const fragment = [{ poly, candidates: [{ name: "Rebuke", score: 0.9 }] }];
  assert.equal(
    addTextConsensus([], [row("Rebuke", 0.9, 2)], fragment).length,
    0,
  );
});
