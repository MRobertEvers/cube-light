export function normalizeName(value) {
  return value.normalize('NFKD').toLowerCase().replace(/[^a-z ]+/g, ' ')
    .split(/\s+/).filter(word => word.length > 1 || word === 'a').join(' ');
}

export function prepareNames(names) {
  return names.map(name => {
    const clean = normalizeName(name);
    return { name, clean, length: clean.length, words: clean ? clean.split(' ').length : 0 };
  }).filter(item => item.length >= 4);
}

function lcsLength(a, b) {
  const previous = new Uint16Array(b.length + 1);
  const current = new Uint16Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      current[j] = a[i - 1] === b[j - 1]
        ? previous[j - 1] + 1 : Math.max(previous[j], current[j - 1]);
    }
    previous.set(current);
    current.fill(0);
  }
  return previous[b.length];
}

export function bestCardName(ocrText, preparedNames) {
  const clean = normalizeName(ocrText);
  if (clean.length < 4) return null;
  const words = clean.split(' ').length;
  const maxLengthDifference = Math.max(5, clean.length * 0.4);
  let best = null;
  for (const candidate of preparedNames) {
    if (Math.abs(candidate.length - clean.length) > maxLengthDifference) continue;
    if (Math.abs(candidate.words - words) > 2) continue;
    const score = candidate.clean === clean ? 100
      : 200 * lcsLength(clean, candidate.clean) / (clean.length + candidate.length);
    if (!best || score > best.score) best = { name: candidate.name, score };
  }
  return best;
}
