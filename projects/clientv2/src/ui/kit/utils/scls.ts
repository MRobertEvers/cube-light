function isString(s: string | undefined | null | false): s is string {
	return typeof s === 'string';
}

function isDefined<T>(s: T | undefined): s is T {
	return typeof s !== 'undefined';
}

/**
 * Joins strings in a convenient way for inline classes.
 *
 * Usage:
 *
 * scls(styles, 'anchor', success && 'success')
 *
 * @param styles
 * @param cls
 * @returns
 */
export function scls(
	styleMap: Record<string, string>,
	...cls: Array<string | undefined | null | false>
): string {
	return cls
		.filter(isString)
		.map((c: string) => styleMap[c])
		.filter(isDefined)
		.join(' ');
}
