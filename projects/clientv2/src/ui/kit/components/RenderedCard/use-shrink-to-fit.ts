import { type RefObject, useLayoutEffect } from 'react';

const STEP = 0.04;

/**
 * Shrinks the element's text until it fits: sets `--fit` on it, from 1 down to `minimum`,
 * which its CSS multiplies into its font size. `axis` is the direction that must not
 * overflow. Refits when the element resizes, when `key` changes, and once fonts load.
 * `mirrors`, when given, get the same `--fit`: copies of the text laid out alongside.
 */
export function useShrinkToFit(ref: RefObject<HTMLElement | null>, key: string, axis: 'width' | 'height', minimum: number, mirrors?: ReadonlyArray<RefObject<HTMLElement | null>>) {
	useLayoutEffect(
		function () {
			const element = ref.current;
			if (!element) return;
			const target = element;

			function overflows() {
				return axis === 'width' ? target.scrollWidth > target.clientWidth + 1 : target.scrollHeight > target.clientHeight + 1;
			}

			function fit() {
				let scale = 1;
				target.style.setProperty('--fit', '1');
				while (overflows() && scale - STEP >= minimum) {
					scale -= STEP;
					target.style.setProperty('--fit', scale.toFixed(2));
				}
				for (const mirror of mirrors ?? []) mirror.current?.style.setProperty('--fit', scale.toFixed(2));
			}

			fit();
			// Changing the font size never changes the element's own box, so this cannot loop.
			const observer = new ResizeObserver(fit);
			observer.observe(target);
			document.fonts.addEventListener('loadingdone', fit);
			return function () {
				observer.disconnect();
				document.fonts.removeEventListener('loadingdone', fit);
			};
		},
		[ref, key, axis, minimum, mirrors]
	);
}
