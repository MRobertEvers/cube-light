import { useLayoutEffect } from 'react';

let locks = 0;
let lockedScrollY = 0;
let previous = {
	overflow: '',
	paddingRight: '',
	position: '',
	top: '',
	left: '',
	right: ''
};

/**
 * Prevents the page behind an open modal from becoming a second scroll surface.
 *
 * iOS ignores `overflow: hidden` when it scrolls a focused field into view
 * above the keyboard, which drags the page (and the fixed overlay with it).
 * Pinning the body with `position: fixed` leaves it nothing to scroll; the
 * scroll position is put back when the last lock is released.
 *
 * iOS also pans the page and its visual viewport when a drag lands on the
 * backdrop, and fixed overlays follow a frame late, which reads as parallax.
 * While locked, drags only go through where something can actually scroll.
 */
export function useDocumentScrollLock() {
	useLayoutEffect(() => {
		if (locks === 0) {
			const body = document.body.style;
			previous = {
				overflow: body.overflow,
				paddingRight: body.paddingRight,
				position: body.position,
				top: body.top,
				left: body.left,
				right: body.right
			};
			lockedScrollY = window.scrollY;
			const scrollbar =
				window.innerWidth - document.documentElement.clientWidth;
			body.overflow = 'hidden';
			body.position = 'fixed';
			body.top = `${-lockedScrollY}px`;
			body.left = '0';
			body.right = '0';
			if (scrollbar > 0) body.paddingRight = `${scrollbar}px`;
			document.documentElement.style.overscrollBehavior = 'none';
			document.addEventListener('touchmove', blockStrayScroll, {
				passive: false
			});
		}
		locks += 1;

		return function () {
			locks -= 1;
			if (locks === 0) {
				const body = document.body.style;
				body.overflow = previous.overflow;
				body.paddingRight = previous.paddingRight;
				body.position = previous.position;
				body.top = previous.top;
				body.left = previous.left;
				body.right = previous.right;
				document.documentElement.style.overscrollBehavior = '';
				document.removeEventListener('touchmove', blockStrayScroll);
				window.scrollTo(0, lockedScrollY);
			}
		};
	}, []);
}

/** Cancels a touch drag unless it starts inside something that can scroll. */
function blockStrayScroll(event: TouchEvent) {
	if (event.touches.length > 1) return;
	for (
		let node = event.target instanceof Element ? event.target : null;
		node && node !== document.body;
		node = node.parentElement
	) {
		if (node.matches('input, textarea, [contenteditable]')) return;
		const style = getComputedStyle(node);
		const scrollsY =
			(style.overflowY === 'auto' || style.overflowY === 'scroll') &&
			node.scrollHeight > node.clientHeight;
		const scrollsX =
			(style.overflowX === 'auto' || style.overflowX === 'scroll') &&
			node.scrollWidth > node.clientWidth;
		if (scrollsY || scrollsX) return;
	}
	if (event.cancelable) event.preventDefault();
}
