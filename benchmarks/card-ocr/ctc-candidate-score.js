// Exact CTC forward likelihood for independently proposed catalog names.
const clean = (s) =>
  s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9\-',æ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const add = (a, b) =>
  a === -Infinity
    ? b
    : b === -Infinity
      ? a
      : Math.max(a, b) + Math.log1p(Math.exp(-Math.abs(a - b)));
export function scoreCTCNames(probabilities, steps, chars, names, blank = 0) {
  const groups = new Map();
  for (let i = 0; i < chars.length; i++) {
    if (i === blank) continue;
    const c = chars[i].toLowerCase();
    if (!groups.has(c)) groups.set(c, []);
    groups.get(c).push(i);
  }
  const cache = new Map(),
    classes = chars.length;
  const sequence = (c) => {
    if (cache.has(c)) return cache.get(c);
    const ids = c === null ? [blank] : groups.get(c);
    if (!ids) return null;
    const p = new Float64Array(steps);
    for (let t = 0; t < steps; t++) {
      let sum = 0;
      for (const i of ids) sum += probabilities[t * classes + i];
      p[t] = Math.log(Math.max(1e-30, sum));
    }
    cache.set(c, p);
    return p;
  };
  const pb = sequence(null),
    results = [];
  for (const name of new Set(names)) {
    const target = Array.from(clean(name));
    if (!target.length || target.length > steps) continue;
    const pp = target.map(sequence);
    if (pp.some((p) => !p)) continue;
    const states = target.length * 2 + 1;
    let prev = new Float64Array(states).fill(-Infinity);
    prev[0] = pb[0];
    prev[1] = pp[0][0];
    for (let t = 1; t < steps; t++) {
      const next = new Float64Array(states).fill(-Infinity);
      for (let s = 0; s < states; s++) {
        let v = prev[s];
        if (s) v = add(v, prev[s - 1]);
        if (s > 1 && s % 2 === 1 && target[(s - 1) / 2] !== target[(s - 3) / 2])
          v = add(v, prev[s - 2]);
        next[s] = v + (s % 2 ? pp[(s - 1) / 2][t] : pb[t]);
      }
      prev = next;
    }
    const logProbability = add(prev[states - 1], prev[states - 2]),
      meanLogProbability = logProbability / target.length;
    results.push({
      name,
      logProbability,
      meanLogProbability,
      rawTokenSupport: Math.exp(meanLogProbability),
    });
  }
  return results.sort((a, b) => b.meanLogProbability - a.meanLogProbability);
}
