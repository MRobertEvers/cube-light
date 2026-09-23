export function concatClassNames(classNames: (string | undefined)[]) {
	return classNames.filter(Boolean).join(' ');
}
