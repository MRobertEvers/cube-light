import React, { useLayoutEffect, useRef, useState } from 'react';
import {
	BannerFrame,
	MAX_MASKED_BANNER_X,
	clamp
} from '../../../../domain/appearance/banner-crop';
import type { ArtworkInfo } from '../../../../domain/appearance/artwork';
import { useAppSelector } from '../../../../redux/use-app-selector';
import { selectParallaxArt } from '../../../../redux/parallax-art/parallax-art.selectors';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { depthMapUrl } from './depth-map';
import { ParallaxArt } from './ParallaxArt';
import { parallaxSupported, parallaxZoom } from './parallax-renderer';
import { ViewArtButton } from './ViewArtButton';
import styles from './banner-artwork.module.css';

type Props = {
	src: string | null;
	frame: BannerFrame;
	onChange?: (frame: BannerFrame) => void;
	label?: string;
	allowLeftBleed?: boolean;
	/**
	 * The image's server-measured sidecar, when there is one: its size places the image
	 * before it loads, and its preview stands in (blurred) until it has.
	 */
	artwork?: ArtworkInfo | null;
	/** Parallax art: whether a mouse over it aims the view (true unless said otherwise). */
	followPointer?: boolean;
};

/**
 * Natural sizes of images this page has already loaded, so a remount (switching tabs,
 * navigating back) shows the image straight away instead of fading it in over the preview.
 */
const loadedImages = new Map<string, { width: number; height: number }>();

function recordLoaded(src: string, width: number, height: number) {
	loadedImages.set(src, { width: width, height: height });
	return { src: src, width: width, height: height };
}

let supported: boolean | null = null;
/** Whether this browser draws parallax art (WebGL 2), asked once. */
function canDrawParallax(): boolean {
	if (supported === null) supported = parallaxSupported();
	return supported;
}

/** Art smaller than this (a header's thumbnail) has no room for buttons and marks over it: the one
 * that opens the whole art, the loading spinner, the motion badge and its prompt. */
const ROOMY_ART_MIN_WIDTH = 120;
const ROOMY_ART_MIN_HEIGHT = 80;

export function BannerArtwork(props: Props) {
	const { src, frame, onChange, label, allowLeftBleed = false, artwork, followPointer = true } = props;
	const viewport = useRef<HTMLDivElement>(null);
	const image = useRef<HTMLImageElement>(null);
	const pointer = useRef<{ x: number; y: number; frame: BannerFrame } | null>(
		null
	);
	const [bounds, setBounds] = useState({ width: 0, height: 0 });
	const [natural, setNatural] = useState({ src: '', width: 0, height: 0 });
	// Parallax art: the profile asks for it, the system does not ask for less motion, and the art is
	// this server's (which makes its height map). The flat image stays underneath as the fallback.
	const parallax = useAppSelector(selectParallaxArt);
	const reducedMotion = usePrefersReducedMotion();
	const depthSrc = parallax && !reducedMotion ? depthMapUrl(src) : null;
	const [parallaxActive, setParallaxActive] = useState(false);
	const roomy = bounds.width >= ROOMY_ART_MIN_WIDTH && bounds.height >= ROOMY_ART_MIN_HEIGHT;

	// Layout effects, so an image that is already loaded is placed before the first paint.
	useLayoutEffect(() => {
		const element = viewport.current;
		if (!element) return;
		const measuredElement = element;
		function measure() {
			return setBounds({
				width: measuredElement.clientWidth,
				height: measuredElement.clientHeight
			});
		}
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(element);
		return function () {
			return observer.disconnect();
		};
	}, []);

	useLayoutEffect(() => {
		const element = image.current;
		if (!src || !element || !element.complete || !element.naturalWidth)
			return;
		setNatural(
			recordLoaded(src, element.naturalWidth, element.naturalHeight)
		);
	}, [src]);

	// Natural size is recorded once the image has loaded, here or in an earlier mount.
	const earlier = src && natural.src !== src ? loadedImages.get(src) : undefined;
	const measured = earlier
		? { src: src ?? '', width: earlier.width, height: earlier.height }
		: natural;
	const loaded = !!src && measured.src === src;
	const known = artwork
		? { src: src ?? '', width: artwork.width, height: artwork.height }
		: measured;
	const preview = artwork?.preview ?? null;
	const scale =
		known.src === src &&
		known.width &&
		known.height &&
		bounds.width &&
		bounds.height
			? Math.max(
					bounds.width / known.width,
					bounds.height / known.height
				) * frame.zoom
			: 0;
	const width = known.width * scale;
	const height = known.height * scale;
	const horizontalOverflow = Math.max(0, width - bounds.width);
	const left =
		-horizontalOverflow * Math.min(frame.x, 1) -
		(allowLeftBleed ? Math.max(0, frame.x - 1) * bounds.width : 0);
	const top = (bounds.height - height) * frame.y;
	// With parallax art on, the flat art is drawn as the parallax view draws it at rest (a little
	// larger: the margins it crops), so the two swap without a jump.
	const zoom = depthSrc && known.width && known.height && canDrawParallax() ? parallaxZoom(known.width, known.height) : null;
	const transform = zoom ? `scale(${zoom.x}, ${zoom.y})` : undefined;

	return (
		<div
			ref={viewport}
			className={`${styles.viewport}${onChange ? ` ${styles.editable}` : ''}`}
			aria-label={label}
			onPointerDown={
				onChange
					? function (event) {
							if (!scale) return;
							pointer.current = {
								x: event.clientX,
								y: event.clientY,
								frame
							};
							event.currentTarget.setPointerCapture(
								event.pointerId
							);
						}
					: undefined
			}
			onPointerMove={
				onChange
					? function (event) {
							if (!pointer.current) return;
							const startLeft =
								-horizontalOverflow *
									Math.min(pointer.current.frame.x, 1) -
								(allowLeftBleed
									? Math.max(0, pointer.current.frame.x - 1) *
										bounds.width
									: 0);
							const nextLeft =
								startLeft + event.clientX - pointer.current.x;
							const verticalRange = bounds.height - height;
							onChange({
								x:
									allowLeftBleed &&
									nextLeft < -horizontalOverflow
										? clamp(
												1 +
													(-horizontalOverflow -
														nextLeft) /
														bounds.width,
												1,
												MAX_MASKED_BANNER_X
											)
										: horizontalOverflow > 0.1
											? clamp(
													-nextLeft /
														horizontalOverflow
												)
											: 0.5,
								y:
									verticalRange < -0.1
										? clamp(
												pointer.current.frame.y +
													(event.clientY -
														pointer.current.y) /
														verticalRange
											)
										: 0.5,
								zoom: pointer.current.frame.zoom
							});
						}
					: undefined
			}
			onPointerUp={() => {
				pointer.current = null;
			}}
			onPointerCancel={() => {
				pointer.current = null;
			}}
		>
			{src && preview && scale ? (
				// Placed exactly where the image will be, so the image replaces it in place.
				<img
					className={styles.preview}
					src={preview}
					alt=""
					aria-hidden="true"
					draggable={false}
					style={{ width, height, left, top, transform }}
				/>
			) : null}
			{src && (
				<img
					ref={image}
					className={
						preview && !loaded
							? styles.pending
							: depthSrc && parallaxActive
								? styles.underParallax
								: undefined
					}
					src={src}
					alt=""
					draggable={false}
					onLoad={(event) =>
						setNatural(
							recordLoaded(
								src ?? '',
								event.currentTarget.naturalWidth,
								event.currentTarget.naturalHeight
							)
						)
					}
					// Unplaced, the image would show at its natural size in the corner.
					style={
						scale
							? { width, height, left, top, transform }
							: { visibility: 'hidden' }
					}
				/>
			)}
			{src && depthSrc && loaded && scale ? (
				<ParallaxArt
					src={src}
					depthSrc={depthSrc}
					width={width}
					height={height}
					left={left}
					top={top}
					onActive={setParallaxActive}
					controls={roomy}
					followPointer={followPointer}
				/>
			) : null}
			{src && depthSrc && parallaxActive && roomy ? (
				<ViewArtButton image={src} size={{ width: known.width, height: known.height }} />
			) : null}
		</div>
	);
}
