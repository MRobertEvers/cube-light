import path from 'path';
import fs from 'fs';

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

export function readAllPrintings(filepath: string): MTGJSONAllPrintings {
	try {
		return JSON.parse(fs.readFileSync(filepath).toString());
	} catch {
		throw new Error(`AllPrintings.json not found at ${filepath}`);
	}
}
