import { readFile } from 'node:fs/promises';
import { bestCardName, prepareNames } from './match-card-name.js';

const readJson = async name => JSON.parse(await readFile(new URL(name, import.meta.url), 'utf8'));
const names = prepareNames(await readJson('./res/card-names.json'));
const run = (await readJson('./results-multi-titles.json')).find(item => item.engine === 'paddle');
if (!run?.outputs) throw new Error('Run npm run bench:multi:titles first');

let correct = 0;
let confidentAndCorrect = 0;
let confident = 0;
for (const item of run.outputs) {
  const suggestion = bestCardName(item.output, names);
  const right = suggestion?.name === item.name;
  const high = (suggestion?.score ?? 0) >= 80;
  if (right) correct++;
  if (high) confident++;
  if (right && high) confidentAndCorrect++;
  if (!right || !high) {
    console.log(`${item.name}: OCR=${JSON.stringify(item.output)}, candidate=${suggestion?.name ?? '(none)'}, score=${suggestion?.score.toFixed(1) ?? 0}`);
  }
}
console.log(`Correct top candidate: ${correct}/${run.outputs.length}`);
console.log(`High-confidence candidates: ${confident}; correct among them: ${confidentAndCorrect}`);
