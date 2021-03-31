export type SetListLookupCard = {
	name: string;
	setCode: string;
	uuid: string;
};

export type SetListLookup = Record<string, Record<string, string[]>>;

export function createSetListLookup(
	cardIter: Generator<SetListLookupCard> | SetListLookupCard[]
): SetListLookup {
	const lookup: Record<string, Record<string, string[]>> = {};

	for (const { name, setCode, uuid } of cardIter) {
		if (typeof lookup[name] === 'undefined') {
			lookup[name] = {};
		}
		if (typeof lookup[name][setCode] === 'undefined') {
			lookup[name][setCode] = [];
		}

		lookup[name][setCode].push(uuid);
	}

	return lookup;
}
