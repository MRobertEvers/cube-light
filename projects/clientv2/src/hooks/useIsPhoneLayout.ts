import { useSyncExternalStore } from 'react';

/** Matches the stylesheets' phone breakpoint. */
const PHONE_QUERY = '(max-width: 680px)';

function subscribe(onChange: () => void) {
	const query = window.matchMedia(PHONE_QUERY);
	query.addEventListener('change', onChange);
	return () => query.removeEventListener('change', onChange);
}

function isPhone() {
	return window.matchMedia(PHONE_QUERY).matches;
}

export function useIsPhoneLayout() {
	return useSyncExternalStore(subscribe, isPhone, () => false);
}
