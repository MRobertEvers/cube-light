import { useLayoutEffect } from 'react';

let locks = 0;
let previousOverflow = '';
let previousPaddingRight = '';

/** Prevents the page behind an open modal from becoming a second scroll surface. */
export function useDocumentScrollLock() {
	useLayoutEffect(() => {
		if (locks === 0) {
			previousOverflow = document.body.style.overflow;
			previousPaddingRight = document.body.style.paddingRight;
			const scrollbar =
				window.innerWidth - document.documentElement.clientWidth;
			document.body.style.overflow = 'hidden';
			if (scrollbar > 0)
				document.body.style.paddingRight = `${scrollbar}px`;
		}
		locks += 1;

		return function () {
			locks -= 1;
			if (locks === 0) {
				document.body.style.overflow = previousOverflow;
				document.body.style.paddingRight = previousPaddingRight;
			}
		};
	}, []);
}
