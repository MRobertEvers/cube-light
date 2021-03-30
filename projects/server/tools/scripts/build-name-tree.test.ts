import path from 'path';
import { createNameLookupTree } from '../../src/app/create-name-lookup-tree';
import { iterMatchesInLookupTree } from './create-completion-list-from-lookup-tree';
import { iterAllPrintingCardNames } from './utils.ts/iter-all-printing-card-names';
import { readAllPrintings } from './utils.ts/read-all-printings';

// const lookupTree = {
// 	a: {
// 		b: {
// 			d: {
// 				$: {}
// 			}
// 		}
// 	},
// 	A: {
// 		b: {
// 			c: {
// 				$: {}
// 			}
// 		}
// 	}
// };
const ALLPRINTINGS_JSON_PATH = path.join(__dirname, '../../src', 'assets/AllPrintings.json');

const lookupTree = createNameLookupTree(
	iterAllPrintingCardNames(readAllPrintings(ALLPRINTINGS_JSON_PATH))
);
for (const name of iterMatchesInLookupTree("thalia'", lookupTree)) {
	console.log(name);
}
