import { exception } from 'console';
import fs from 'fs';
import path from 'path';

const SRC_PATH = path.resolve('.');
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

function readAllPrintings(): MTGJSONAllPrintings {
	try {
		return JSON.parse(fs.readFileSync(ALLPRINTINGS_JSON_PATH).toString());
	} catch {
		throw new Error(`AllPrintings.json not found at ${ALLPRINTINGS_JSON_PATH}`);
	}
}

function createNameLookupTree(allPrintings: MTGJSONAllPrintings) {
	const lookup: Record<string, any> = {};
	for (const set of Object.values(allPrintings.data)) {
		for (const card of set.cards) {
			let current = lookup;
			for (const char of card.name) {
				if (typeof current[char] === 'undefined') {
					current[char] = {};
				}
				current = current[char];
			}

			// Indicate that there is a card name that stops here.
			current['$'] = {};
		}
	}

	return lookup;
}

function saveLookupTreeToFile(filename: string, lookupTree: any) {
	fs.writeFileSync(filename, JSON.stringify(lookupTree));
}

async function main() {
	const allPrintingsJson = readAllPrintings();

	const lookupTree = createNameLookupTree(allPrintingsJson);

	saveLookupTreeToFile(path.join(SRC_PATH, 'src/public/NameLookup.json'), lookupTree);
}
main();
