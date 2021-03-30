import { API_URI } from '../config/api-url';
import { fetchTimeout } from './utils';

// Cache this globally since it may be expensive.
// TODO: Better way to do this?

let NAME_LOOKUP: any = undefined;

export async function fetchAPINameLookup(): Promise<any> {
	if (typeof NAME_LOOKUP !== 'undefined') {
		return NAME_LOOKUP;
	}

	const request = await fetchTimeout(`${API_URI}/suggest/card-names`, {
		method: 'GET'
	});

	NAME_LOOKUP = request.json() as Promise<any>;

	return NAME_LOOKUP;
}
