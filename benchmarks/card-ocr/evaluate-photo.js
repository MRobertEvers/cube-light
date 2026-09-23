// Evaluation only. Never import this module or annotations into an inference worker.
export function evaluatePhoto(candidates, truth) {
  const unmatched = new Set(truth.cards.map((card) => card.id));
  const hits = [],
    falsePositives = [];
  for (const candidate of candidates.filter((c) => c.status === "accepted")) {
    const b = candidate.box,
      x = b.x + b.w / 2,
      y = b.y + b.h / 2;
    const card = truth.cards.find(
      (card) =>
        unmatched.has(card.id) &&
        card.name === candidate.name &&
        x >= card.box[0] - 12 &&
        x <= card.box[0] + card.box[2] + 12 &&
        y >= card.box[1] - 12 &&
        y <= card.box[1] + card.box[3] + 12,
    );
    if (card) {
      unmatched.delete(card.id);
      hits.push({
        id: card.id,
        name: card.name,
        visibility: card.visibility,
        box: card.box,
        text: candidate.text,
      });
    } else falsePositives.push(candidate);
  }
  const missing = truth.cards.filter((card) => unmatched.has(card.id));
  const accepted = hits.length + falsePositives.length;
  return {
    accepted,
    correct: hits.length,
    precision: accepted ? hits.length / accepted : null,
    recall: hits.length / truth.cards.length,
    fullCorrect: hits.filter((card) => card.visibility === "full").length,
    fullTotal: truth.cards.filter((card) => card.visibility === "full").length,
    partialCorrect: hits.filter((card) => card.visibility === "partial").length,
    partialTotal: truth.cards.filter((card) => card.visibility === "partial")
      .length,
    uniqueCorrect: new Set(hits.map((card) => card.name)).size,
    uniqueTotal: new Set(truth.cards.map((card) => card.name)).size,
    missing,
    hits,
    falsePositives,
    meetsTarget:
      hits.length / truth.cards.length >= 0.95 && falsePositives.length === 0,
  };
}
