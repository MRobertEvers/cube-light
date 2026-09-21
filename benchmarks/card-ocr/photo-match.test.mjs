import test from "node:test";
import assert from "node:assert/strict";
import { buildIndex, rankNames, matchDetections } from "./photo-match.js";
const index = buildIndex([
  "Aether Chaser",
  "Aether Charge",
  "Aether Swooper",
  "Kenku Artificer",
  "Synod Artificer",
  "Metallic Rebuke",
  "Selfcraft Mechan",
  "Gearseeker Serpent",
  "Fire // Ice",
]);
const item = (text, x = 0, y = 0) => ({
  text,
  score: 0.98,
  poly: [
    [x, y],
    [x + 180, y],
    [x + 180, y + 20],
    [x, y + 20],
  ],
});
test("exact and face alias lookup", () => {
  assert.equal(rankNames("Metallic Rebuke", index)[0].name, "Metallic Rebuke");
  assert.equal(rankNames("Ice", index).length, 0);
});
test("counts repeated physical cards but collapses overlapping tile observations", () => {
  const result = matchDetections(
    [
      {
        items: [
          item("Metallic Rebuke"),
          item("Metallic Rebuke", 2, 1),
          item("Metallic Rebuke", 220, 0),
        ],
      },
    ],
    index,
  );
  assert.equal(result.filter((c) => c.status === "accepted").length, 2);
});
test("rules text and truncated names do not become accepted card copies", () => {
  const result = matchDetections(
    [
      {
        items: [
          item("When Aether Chaser enters"),
          item("Creature — Human Artificer"),
          item("Gearseeker"),
          item("Aether"),
        ],
      },
    ],
    index,
  );
  assert.equal(result.filter((c) => c.status === "accepted").length, 0);
});
test("ambiguous misspelling stays in review", () => {
  const r = matchDetections([{ items: [item("Aether Charer")] }], index);
  assert.ok(r.every((c) => c.status === "review"));
});
test("an exact short fragment cannot erase an accepted full title", () => {
  const names = buildIndex(["Metallic Rebuke", "Rebuke"]);
  const result = matchDetections(
    [
      {
        items: [
          item("Metallic Rebuke"),
          {
            ...item("Rebuke", 80, 0),
            poly: [
              [80, 0],
              [180, 0],
              [180, 20],
              [80, 20],
            ],
          },
        ],
      },
    ],
    names,
  );
  assert.equal(
    result.filter((c) => c.status === "accepted")[0].name,
    "Metallic Rebuke",
  );
});
test("lowercase type-line suffix is not accepted as Kenku Artificer", () => {
  assert.ok(
    matchDetections([{ items: [item("ken Artificer")] }], index).every(
      (c) => c.status === "review",
    ),
  );
});

import { evaluatePhoto } from "./evaluate-photo.js";
test("evaluation does not credit a card name found only in rules text", () => {
  const truth = {
    cards: [
      {
        id: "a",
        name: "Aether Chaser",
        visibility: "full",
        box: [0, 0, 180, 20],
      },
    ],
  };
  const metric = evaluatePhoto(
    [
      {
        name: "Aether Chaser",
        status: "accepted",
        box: { x: 0, y: 150, w: 180, h: 20 },
      },
    ],
    truth,
  );
  assert.equal(metric.correct, 0);
  assert.equal(metric.falsePositives.length, 1);
  assert.equal(metric.meetsTarget, false);
});
test("evaluation never counts one annotated card twice", () => {
  const truth = {
    cards: [
      {
        id: "a",
        name: "Aether Chaser",
        visibility: "full",
        box: [0, 0, 180, 20],
      },
    ],
  };
  const candidate = {
    name: "Aether Chaser",
    status: "accepted",
    box: { x: 0, y: 0, w: 180, h: 20 },
  };
  const metric = evaluatePhoto([candidate, candidate], truth);
  assert.equal(metric.correct, 1);
  assert.equal(metric.falsePositives.length, 1);
});
