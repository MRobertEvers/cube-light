import fs from 'fs';
import path from 'path';
import { createNameLookupTree } from '../../src/app/create-name-lookup-tree';
import { iterAllPrintingCardNames } from './utils.ts/iter-all-printing-card-names';
import { readAllPrintings } from './utils.ts/read-all-printings';

const SRC_PATH = path.resolve('src');
const ALLPRINTINGS_JSON_PATH = path.join(SRC_PATH, 'assets/AllPrintings.json');

function saveLookupTreeToFile(filename: string, lookupTree: any) {
	fs.writeFileSync(filename, JSON.stringify(lookupTree));
}

async function main() {
	const allPrintingsJson = readAllPrintings(ALLPRINTINGS_JSON_PATH);

	const lookupTree = createNameLookupTree(iterAllPrintingCardNames(allPrintingsJson));

	saveLookupTreeToFile(path.join(SRC_PATH, 'src/public/NameLookup.json'), lookupTree);
}
main();
