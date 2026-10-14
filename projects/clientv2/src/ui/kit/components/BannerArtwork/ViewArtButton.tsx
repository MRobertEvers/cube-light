import React, { useState } from 'react';
import { useAppSelector } from '../../../../redux/use-app-selector';
import { selectParallaxArt } from '../../../../redux/parallax-art/parallax-art.selectors';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { artCropUrl, depthMapUrl } from './depth-map';
import { ParallaxArtViewer } from './ParallaxArtViewer';
import styles from './banner-artwork.module.css';

type Props = {
	/** This server's card image of any size (a printing's card image, or its art crop). */
	image: string | null | undefined;
	/** The art crop's natural size, when known; the viewer measures it otherwise. */
	size?: { width: number; height: number } | null;
	/** Over art: the corner. Over a whole card image: the art box's corner. */
	placement?: 'corner' | 'card';
};

/**
 * The button over a card's art that opens the whole art crop drawn with depth (ParallaxArtViewer),
 * placed in a positioned parent. Shown only with parallax art on and art this server makes maps of.
 */
export function ViewArtButton(props: Props) {
	const { image, size = null, placement = 'corner' } = props;
	const parallax = useAppSelector(selectParallaxArt);
	const reducedMotion = usePrefersReducedMotion();
	const [viewing, setViewing] = useState(false);
	const art = artCropUrl(image);
	const depthSrc = parallax && !reducedMotion ? depthMapUrl(art) : null;
	if (!art || !depthSrc) return null;
	return (
		<>
			<button
				type="button"
				className={`${styles.viewArt}${placement === 'card' ? ` ${styles.viewArtOnCard}` : ''}`}
				aria-label="View the whole card art with depth"
				title="View the whole art"
				// Not a drag to crop, nor a tap on the art (ParallaxArt's motion prompt), nor a click on
				// whatever the art sits in (a link, a tile).
				onPointerDown={(event) => event.stopPropagation()}
				onPointerUp={(event) => event.stopPropagation()}
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					setViewing(true);
				}}
			>
				<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
					<path d="M14 4h6v6" />
					<path d="M20 4l-7 7" />
					<path d="M10 20H4v-6" />
					<path d="M4 20l7-7" />
				</svg>
			</button>
			{viewing ? <ParallaxArtViewer src={art} depthSrc={depthSrc} size={size} onClose={() => setViewing(false)} /> : null}
		</>
	);
}
