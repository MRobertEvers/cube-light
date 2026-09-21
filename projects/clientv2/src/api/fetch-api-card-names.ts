import { API_URI } from '../config/api-url';
import { apiFetch } from './utils';

let namesPromise: Promise<string[]> | undefined;

export function fetchAPICardNames(): Promise<string[]> {
	if (!namesPromise) {
		namesPromise = apiFetch(`${API_URI}/suggest/card-names/all`)
			.then((response) => {
				if (!response.ok) throw new Error('Could not load card names');
				return response.json() as Promise<string[]>;
			})
			.catch((error) => {
				namesPromise = undefined;
				throw error;
			});
	}
	return namesPromise;
}
