import fs from 'fs';
import path from 'path';
import { createSetListLookup } from '../../src/app/create-set-list-lookup';
import { iterAllCards } from './utils.ts/iter-all-cards';
import { readAllPrintings } from './utils.ts/read-all-printings';

const SRC_PATH = path.resolve('src');
const ALLPRINTINGS_JSON_PATH = path.join(SRC_PATH, 'assets/AllPrintings.json');

function saveLookupTreeToFile(filename: string, lookupTree: any) {
	fs.writeFileSync(filename, JSON.stringify(lookupTree));
}

async function main() {
	const allPrintingsJson = readAllPrintings(ALLPRINTINGS_JSON_PATH);

	const lookupTree = createSetListLookup(iterAllCards(allPrintingsJson));

	saveLookupTreeToFile(path.join(SRC_PATH, 'public/SetLookup.json'), lookupTree);
}
main();
