/** A new aggregate id such as `deck_…`, unguessable and safe in a URL path. */
export function newId(kind: string): string {
	const bytes = crypto.getRandomValues(new Uint8Array(12));
	return `${kind}_${btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')}`;
}
