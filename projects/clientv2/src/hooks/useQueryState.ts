import React from 'react';

export interface UseQueryStateOptions<T> {
	parse: (value: string) => T | null;
	serialize: (value: T) => string;
	default?: string;
}

export type UseQueryStateReturn<T> = [T | null, React.Dispatch<React.SetStateAction<T>>];

/**
 * React state hook synchronized with a URL query string in Next.js
 *
 * @param key - The URL query string key to bind to
 */
export function useQueryState<T = string>(
	key: string,
	{
		parse = (x) => (x as unknown) as T,
		serialize = (x) => `${x}`
	}: Partial<UseQueryStateOptions<T>> = {}
): UseQueryStateReturn<T | null> {
	// Memoizing the update function has the advantage of making it
	// immutable as long as `history` stays the same.
	// It reduces the amount of reactivity needed to update the state.

	const getValue = (): T | null => {
		const query = new URLSearchParams(window.location.search);
		const value = query.get(key);
		return value ? parse(value) : null;
	};

	// Update the state value only when the relevant key changes.
	// Because we're not calling getValue in the function argument
	// of React.useMemo, but instead using it as the function to call,
	// there is no need to pass it in the dependency array.
	const [value, setValue] = React.useState(getValue());

	const update = React.useCallback(
		(stateUpdater: React.SetStateAction<T | null>) => {
			const isUpdaterFunction = (input: any): input is (prevState: T | null) => T | null => {
				return typeof input === 'function';
			};

			// Resolve the new value based on old value & updater
			const oldValue = getValue();
			const newValue = isUpdaterFunction(stateUpdater)
				? stateUpdater(oldValue)
				: stateUpdater;
			// We can't rely on router.query here to avoid causing
			// unnecessary renders when other query parameters change.
			// URLSearchParams is already polyfilled by Next.js
			const query = new URLSearchParams(window.location.search);
			if (typeof newValue !== 'undefined' && newValue !== null) {
				query.set(key, serialize(newValue));
			} else {
				// Don't leave value-less keys hanging
				query.delete(key);
			}

			// Remove fragment and query from asPath
			// router.pathname includes dynamic route keys, rather than the route itself,
			// e.g. /views/[view] rather than /views/my-view
			const [asPath] = window.location.href.split(/\?|#/, 1);

			window.history.pushState({}, '', `${asPath}?${query.toString()}`);
			setValue(newValue);
		},
		[key, value, setValue]
	);

	React.useEffect(() => {
		const onStateChange = () => {
			setValue(getValue());
		};

		window.addEventListener('popstate', onStateChange);
		return () => {
			window.removeEventListener('popstate', onStateChange);
		};
	}, [key, value, setValue]);

	return [value, update];
}

// export function useQueryState() {

// }
