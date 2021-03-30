import { exception } from 'console';
import fs from 'fs';
import path from 'path';
import { createNameLookupTree } from '../../src/app/create-name-lookup-tree';

const SRC_PATH = path.resolve('src');
const ALLPRINTINGS_JSON_PATH = path.join(SRC_PATH, 'assets/AllPrintings.json');

export type MTGJSONMeta = {
	date: string;
	version: string;
};

export type MTGJSONCard = {
	artist: string;
	asciiName: string;
	borderColor: string;
	colorIdentity: Array<string>;
	colors: Array<string>;
	convertedManaCost: number;
	manaCost: string;
	faceName?: string;
	layout: string;
	name: string;
	number: string;
	setCode: string;
	subtypes: string[];
	supertypes: string[];
	text: string;
	toughness: string;
	power: string;
	types: string[];
	uuid: string;
};

export type MTGJSONSet = {
	baseSetSize: number;
	cards: Array<MTGJSONCard>;
	code: string;
	name: string;
	releaseDate: string;
	type: string;
};

export type MTGJSONAllPrintings = {
	meta: MTGJSONMeta;
	data: Record<string, MTGJSONSet>;
};

export function readAllPrintings(): MTGJSONAllPrintings {
	try {
		return JSON.parse(fs.readFileSync(ALLPRINTINGS_JSON_PATH).toString());
	} catch {
		throw new Error(`AllPrintings.json not found at ${ALLPRINTINGS_JSON_PATH}`);
	}
}

function* iterAllPrintingCardNames(allPrintings: MTGJSONAllPrintings): Generator<string> {
	const lookup: Record<string, any> = {};
	for (const set of Object.values(allPrintings.data)) {
		for (const card of set.cards) {
			yield card.name;
		}
	}

	return lookup;
}

function saveLookupTreeToFile(filename: string, lookupTree: any) {
	fs.writeFileSync(filename, JSON.stringify(lookupTree));
}

async function main() {
	const allPrintingsJson = readAllPrintings();

	const lookupTree = createNameLookupTree(iterAllPrintingCardNames(allPrintingsJson));

	saveLookupTreeToFile(path.join(SRC_PATH, 'src/public/NameLookup.json'), lookupTree);
}
main();
