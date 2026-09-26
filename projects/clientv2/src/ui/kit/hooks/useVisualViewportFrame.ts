import { useLayoutEffect } from 'react';

let frames = 0;
let pending = 0;
let lastHeight = 0;
let settleTimers: number[] = [];
let probe: HTMLDivElement | null = null;
// Safari's floating form bar is about 44px tall with a little margin around it.
const KEYBOARD_BAR_PX = 52;

/**
 * Publishes how much of a full-screen fixed overlay is out of sight while an
 * overlay is open: --visual-viewport-top above the visible area and
 * --keyboard-inset below it, usually under the phone keyboard. --keyboard-bar
 * is room to leave above an open keyboard: iOS Safari floats its form bar
 * (previous, next, done) there, over the page, without counting it in the
 * visual viewport, and only sometimes, so it cannot be measured.
 *
 * A phone keyboard shrinks only the visual viewport, so an overlay pinned
 * with `inset: 0` keeps its full height and its content ends up behind the
 * keyboard. Overlays keep covering the whole screen (so the dimmed backdrop
 * still reaches under a translucent keyboard) and pad their content by these
 * insets instead. When the keyboard opens the focused field is scrolled back
 * into view.
 */
export function useVisualViewportFrame() {
	useLayoutEffect(() => {
		const viewport = window.visualViewport;
		if (!viewport) return;
		if (frames === 0) {
			probe = document.createElement('div');
			probe.setAttribute('aria-hidden', 'true');
			probe.style.cssText =
				'position:fixed;inset:0;visibility:hidden;pointer-events:none';
			document.body.appendChild(probe);
			lastHeight = viewport.height;
			publish();
			viewport.addEventListener('resize', schedule);
			viewport.addEventListener('scroll', schedule);
			window.addEventListener('scroll', schedule);
			document.addEventListener('focusin', settle);
			document.addEventListener('focusout', settle);
		}
		frames += 1;

		return function () {
			frames -= 1;
			if (frames > 0) return;
			viewport.removeEventListener('resize', schedule);
			viewport.removeEventListener('scroll', schedule);
			window.removeEventListener('scroll', schedule);
			document.removeEventListener('focusin', settle);
			document.removeEventListener('focusout', settle);
			cancelAnimationFrame(pending);
			pending = 0;
			settleTimers.forEach((timer) => clearTimeout(timer));
			settleTimers = [];
			const root = document.documentElement.style;
			root.removeProperty('--visual-viewport-top');
			root.removeProperty('--keyboard-inset');
			root.removeProperty('--keyboard-bar');
			probe?.remove();
			probe = null;
		};
	}, []);
}

function schedule() {
	if (pending) return;
	pending = requestAnimationFrame(function () {
		pending = 0;
		publish();
	});
}

/**
 * iOS reports the viewport partway through the keyboard animation and pans the
 * page afterwards without always firing another event, so read it again once
 * the keyboard has had time to finish moving.
 */
function settle() {
	schedule();
	settleTimers.forEach((timer) => clearTimeout(timer));
	settleTimers = [150, 350, 650].map((delay) =>
		window.setTimeout(schedule, delay)
	);
}

function publish() {
	const viewport = window.visualViewport;
	if (!viewport) return;
	if (!probe) return;
	// The probe is exactly the box an `inset: 0` overlay fills, which on iOS is
	// not always the height the browser reports for the layout viewport.
	const frame = probe.getBoundingClientRect();
	const top = Math.max(0, viewport.offsetTop - frame.top);
	const bottom = Math.max(
		0,
		frame.bottom - viewport.offsetTop - viewport.height
	);
	const root = document.documentElement.style;
	root.setProperty('--visual-viewport-top', `${top}px`);
	root.setProperty('--keyboard-inset', `${bottom}px`);
	root.setProperty('--keyboard-bar', bottom > 0 ? `${KEYBOARD_BAR_PX}px` : '0px');

	// Focus scrolls the field into view before the keyboard finishes opening,
	// so bring it back once the viewport has actually shrunk.
	const shrank = viewport.height < lastHeight;
	lastHeight = viewport.height;
	const active = document.activeElement;
	if (
		shrank &&
		active instanceof HTMLElement &&
		active.matches('input, textarea, select, [contenteditable]')
	)
		revealInScroller(active);
}

/**
 * Scrolls only the overlay's own scroll area. scrollIntoView would also pan
 * the page and the visual viewport, which moves the overlay out from under
 * the offsets just published.
 */
function revealInScroller(element: HTMLElement) {
	for (
		let scroller = element.parentElement;
		scroller && scroller !== document.body;
		scroller = scroller.parentElement
	) {
		const overflow = getComputedStyle(scroller).overflowY;
		if (overflow !== 'auto' && overflow !== 'scroll') continue;
		if (scroller.scrollHeight <= scroller.clientHeight) continue;
		const box = scroller.getBoundingClientRect();
		const field = element.getBoundingClientRect();
		const margin = 12;
		if (field.bottom > box.bottom - margin)
			scroller.scrollTop += field.bottom - box.bottom + margin;
		else if (field.top < box.top + margin)
			scroller.scrollTop -= box.top + margin - field.top;
		return;
	}
}
