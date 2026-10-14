import React, { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { decodedImage, loadArt, loadDepthMap } from './depth-map';
import { motionAccess, OrientationTilt, requestMotionAccess, subscribeMotionAccess, subscribeOrientation } from './device-motion';
import { ParallaxRenderer } from './parallax-renderer';
import styles from './banner-artwork.module.css';

type Props = {
	/** The art crop, and its height map's address. */
	src: string;
	depthSrc: string;
	/** Where the art is placed in its frame, in CSS pixels (BannerArtwork's placement). */
	width: number;
	height: number;
	left: number;
	top: number;
	/** True once the art is drawn with depth (the flat image can step aside), false when it no longer is. */
	onActive: (active: boolean) => void;
	/** Whether the art has room for its marks (the loading spinner, the motion badge) and is offered
	 * the motion prompt; a header's thumbnail has not. */
	controls: boolean;
	/** Whether a mouse over the art aims the view (true unless said otherwise); without, the view
	 * drifts on its own, or follows the phone. */
	followPointer?: boolean;
};

/** The drawing buffer's most pixels: the march reads the map dozens of times per pixel. */
const MAX_PIXELS = 1600 * 1000;
/** How quickly the view follows the pointer or the phone, per second. */
const FOLLOW = 6;
/** A phone whose sensor has said nothing for this long is not followed (the drift resumes). */
const SENSOR_QUIET_MS = 1000;
/** How long the motion button stays up when it is not pressed. */
const PROMPT_MS = 8000;
const TOUCH_QUERY = '(hover: none) and (pointer: coarse)';
/** How long art seen for the first time fades in over the flat art (art seen before is drawn at once). */
const FADE_MS = 220;

/** How the phone is held, for every banner: a page's banners share it, and so does the next page's. */
const phone = new OrientationTilt();

/** Where the view looks at `time` without a mouse over the art: the phone, else a slow drift. The
 * drift is the clock's, so a banner on the next page picks it up where the last one was. */
function restingAim(time: number): { x: number; y: number } {
	if (phone.tilt && time - phone.lastReading < SENSOR_QUIET_MS) return phone.tilt;
	const seconds = time / 1000;
	return { x: Math.sin(seconds * 0.45) * 0.45, y: Math.cos(seconds * 0.31) * 0.3 };
}

function subscribeTouch(onChange: () => void) {
	const query = window.matchMedia(TOUCH_QUERY);
	query.addEventListener('change', onChange);
	return function () {
		return query.removeEventListener('change', onChange);
	};
}

function isTouch() {
	return window.matchMedia(TOUCH_QUERY).matches;
}

/**
 * The art drawn with depth over the flat image. The view tilts toward a mouse over the art, with
 * the phone as it is tilted, and otherwise drifts slowly. On a phone that must be asked (iOS), a
 * small badge says the art can follow it, and a tap on the art offers the button that asks. Draws
 * only while on screen. Any failure (no WebGL 2, no map, a lost context) leaves the flat image,
 * which stays underneath throughout.
 */
export function ParallaxArt(props: Props) {
	const { src, depthSrc, width, height, left, top, onActive, controls, followPointer = true } = props;
	const canvas = useRef<HTMLCanvasElement>(null);
	const onActiveRef = useRef(onActive);
	onActiveRef.current = onActive;
	const followPointerRef = useRef(followPointer);
	followPointerRef.current = followPointer;
	const [active, setActive] = useState(false);
	const [fadeIn, setFadeIn] = useState(false);
	// Draws again at once, after the drawing buffer is resized (which clears it).
	const redraw = useRef<(() => void) | null>(null);
	const [loading, setLoading] = useState(false);
	const [prompt, setPrompt] = useState(false);
	const [asking, setAsking] = useState(false);
	const access = useSyncExternalStore(subscribeMotionAccess, motionAccess, () => 'denied' as const);
	const touch = useSyncExternalStore(subscribeTouch, isTouch, () => false);
	const needsAsking = controls && touch && (access === 'ask' || access === 'denied');
	const needsAskingRef = useRef(needsAsking);
	needsAskingRef.current = needsAsking;

	// The drawing buffer follows the placed size (and the screen's density, within a budget). A layout
	// effect, before the one that may draw before the first paint.
	useLayoutEffect(() => {
		const element = canvas.current;
		if (!element || width <= 0 || height <= 0) return;
		const density = Math.min(window.devicePixelRatio || 1, Math.sqrt(MAX_PIXELS / (width * height)));
		const nextWidth = Math.max(1, Math.round(width * density));
		const nextHeight = Math.max(1, Math.round(height * density));
		if (element.width === nextWidth && element.height === nextHeight) return;
		element.width = nextWidth;
		element.height = nextHeight;
		redraw.current?.();
	}, [width, height]);

	// The phone, once it may be listened to.
	useEffect(() => {
		if (access !== 'unneeded' && access !== 'granted') return;
		return subscribeOrientation((reading) => phone.read(reading, performance.now()));
	}, [access]);

	// The button goes away by itself.
	useEffect(() => {
		if (!prompt) return;
		const timer = setTimeout(() => setPrompt(false), PROMPT_MS);
		return function () {
			clearTimeout(timer);
		};
	}, [prompt]);

	// A layout effect: art decoded before (the last page's) is drawn before the first paint.
	useLayoutEffect(() => {
		const element = canvas.current;
		if (!element) return;
		const target = element;
		const controller = new AbortController();
		let renderer: ParallaxRenderer | null = null;
		let frame = 0;
		let visible = false;
		let pointer: { x: number; y: number } | null = null;
		let tilt = restingAim(performance.now());
		let fadeTimer = 0;
		let last = 0;
		let drawnSize = '';
		let drawnTilt = { x: NaN, y: NaN };

		function setLive(live: boolean) {
			setActive(live);
			onActiveRef.current(live);
		}

		/** Draws the art with depth from now on; `fade` for art seen for the first time, which fades in
		 * over the flat art (still shown until it has). */
		function goLive(art: ImageBitmap, depth: ImageBitmap, fade: boolean) {
			renderer = ParallaxRenderer.create(target);
			if (!renderer || !renderer.setImages(art, depth, art.width, art.height)) {
				renderer?.dispose();
				renderer = null;
				return;
			}
			renderer.draw(tilt.x, tilt.y);
			drawnTilt = tilt;
			drawnSize = `${target.width}x${target.height}`;
			redraw.current = function () {
				if (!renderer) return;
				renderer.draw(tilt.x, tilt.y);
				drawnTilt = tilt;
				drawnSize = `${target.width}x${target.height}`;
			};
			if (fade) {
				setFadeIn(true);
				setActive(true);
				fadeTimer = window.setTimeout(() => onActiveRef.current(true), FADE_MS);
			} else {
				setLive(true);
			}
			start();
		}

		function stop() {
			if (frame) cancelAnimationFrame(frame);
			frame = 0;
		}

		function aim(time: number): { x: number; y: number } {
			return pointer ?? restingAim(time);
		}

		function tick(time: number) {
			frame = 0;
			if (!renderer || !visible || document.hidden) return;
			if (renderer.lost()) {
				setLive(false);
				return;
			}
			const step = last ? Math.min((time - last) / 1000, 0.1) : 0;
			last = time;
			const goal = aim(time);
			const follow = Math.min(1, step * FOLLOW);
			tilt = { x: tilt.x + (goal.x - tilt.x) * follow, y: tilt.y + (goal.y - tilt.y) * follow };
			const size = `${target.width}x${target.height}`;
			if (size !== drawnSize || Math.abs(tilt.x - drawnTilt.x) > 1e-4 || Math.abs(tilt.y - drawnTilt.y) > 1e-4) {
				renderer.draw(tilt.x, tilt.y);
				drawnSize = size;
				drawnTilt = tilt;
			}
			frame = requestAnimationFrame(tick);
		}

		function start() {
			if (!frame && renderer && visible && !document.hidden) {
				last = 0;
				frame = requestAnimationFrame(tick);
			}
		}

		function inside(event: PointerEvent): DOMRect | null {
			const rect = target.getBoundingClientRect();
			const within =
				event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
			return within ? rect : null;
		}

		// A mouse (or pen) over the art aims the view; a finger does not (it scrolls, and taps).
		function onPointerMove(event: PointerEvent) {
			if (event.pointerType === 'touch') return;
			if (!followPointerRef.current) {
				pointer = null;
				return;
			}
			const rect = inside(event);
			pointer = rect
				? {
						x: Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1)),
						y: Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1))
					}
				: null;
		}

		// A tap on the art, on a phone that must be asked, offers the button that asks.
		function onPointerUp(event: PointerEvent) {
			if (event.pointerType !== 'touch' || !renderer || !needsAskingRef.current) return;
			if (inside(event)) setPrompt(true);
		}

		const observer = new IntersectionObserver((entries) => {
			visible = entries.some((entry) => entry.isIntersecting);
			if (visible) start();
			else stop();
		});
		observer.observe(target);
		window.addEventListener('pointermove', onPointerMove, { passive: true });
		window.addEventListener('pointerup', onPointerUp, { passive: true });
		document.addEventListener('visibilitychange', start);
		target.addEventListener('webglcontextlost', () => setLive(false));

		const knownArt = decodedImage(src);
		const knownDepth = decodedImage(depthSrc);
		if (knownArt && knownDepth) {
			goLive(knownArt, knownDepth, false);
		} else {
			setLoading(true);
			void Promise.all([loadArt(src, controller.signal), loadDepthMap(depthSrc, controller.signal)])
				.finally(() => {
					if (!controller.signal.aborted) setLoading(false);
				})
				.then((images) => {
					const art = images[0];
					const depth = images[1];
					if (controller.signal.aborted || !art || !depth) return;
					goLive(art, depth, true);
				})
				.catch(() => undefined);
		}

		return function () {
			controller.abort();
			stop();
			observer.disconnect();
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
			document.removeEventListener('visibilitychange', start);
			window.clearTimeout(fadeTimer);
			redraw.current = null;
			renderer?.dispose();
			renderer = null;
			setActive(false);
			setFadeIn(false);
			setLoading(false);
			onActiveRef.current(false);
		};
	}, [src, depthSrc]);

	return (
		<>
			<canvas
				ref={canvas}
				className={fadeIn ? `${styles.parallax} ${styles.parallaxFadeIn}` : styles.parallax}
				aria-hidden="true"
				style={{ width, height, left, top }}
			/>
			{loading && controls && (
				<span className={styles.depthPending} role="status" title="Adding depth to the art">
					<span className={styles.spinner} aria-hidden="true" />
					<span className={styles.visuallyHidden}>Adding depth to the art</span>
				</span>
			)}
			{active && needsAsking && !prompt && (
				<span className={styles.motionBadge} title="Tap the art to let it move with your phone" aria-hidden="true">
					<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
						<rect x="8" y="3" width="8" height="15" rx="1.8" transform="rotate(-14 12 10.5)" />
						<path d="M3.5 15.5c.6 2.3 2.2 4.1 4.4 5" />
						<path d="M20.5 8.5c-.6-2.3-2.2-4.1-4.4-5" />
					</svg>
				</span>
			)}
			{active &&
				needsAsking &&
				prompt &&
				// Over the page, not in the art's clipped frame: art can be too small to hold it.
				createPortal(
					<div className={styles.motionPrompt}>
						<button
							type="button"
							disabled={asking}
							onPointerDown={(event) => event.stopPropagation()}
							onPointerUp={(event) => event.stopPropagation()}
							onClick={(event) => {
								event.stopPropagation();
								setAsking(true);
								void requestMotionAccess().finally(() => {
									setAsking(false);
									setPrompt(false);
								});
							}}
						>
							{access === 'denied' ? 'Motion is blocked: try again' : 'Move with your phone'}
						</button>
					</div>,
					document.body
				)}
		</>
	);
}
