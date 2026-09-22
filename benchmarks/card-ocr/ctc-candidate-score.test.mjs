import test from "node:test";
import assert from "node:assert/strict";
import { scoreCTCNames } from "./ctc-candidate-score.js";
test("CTC repeated letters require a separating blank", () => {
  const r = scoreCTCNames(
    [0.1, 0.9, 0.8, 0.2, 0.1, 0.9],
    3,
    ["_", "a"],
    ["a", "aa"],
  );
  const probability = (name) =>
    Math.exp(r.find((c) => c.name === name).logProbability);
  assert.ok(Math.abs(probability("aa") - 0.648) < 1e-10);
  assert.ok(Math.abs(probability("a") - 0.344) < 1e-10);
});
test("case folding sums original probabilities without renormalizing the vocabulary", () => {
  const r = scoreCTCNames([0.1, 0.4, 0.5], 1, ["_", "a", "A"], ["A"]);
  assert.ok(Math.abs(r[0].rawTokenSupport - 0.9) < 1e-10);
});
test("unsupported characters do not become a forced confident name", () => {
  assert.deepEqual(scoreCTCNames([0.1, 0.9], 1, ["_", "a"], ["z"]), []);
});
