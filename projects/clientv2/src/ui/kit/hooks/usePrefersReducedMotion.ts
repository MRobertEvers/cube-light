import { useSyncExternalStore } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
	const query = window.matchMedia(REDUCED_MOTION_QUERY);
	query.addEventListener('change', onChange);
	return function () {
		return query.removeEventListener('change', onChange);
	};
}

function prefersReducedMotion() {
	return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** Whether the system asks for less motion. */
export function usePrefersReducedMotion() {
	return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}
