import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HeaderBackButton } from '../BackLink/BackLink';
import { HeaderBackSlot } from '../Header/HeaderBackSlot';
import { HotkeyScope, useHotkeyLayer } from '../../hotkeys/Hotkeys';
import { useCloseOnEscape } from '../../hooks/useCloseOnEscape';
import { useDocumentScrollLock } from '../../hooks/useDocumentScrollLock';
import { ParallaxArt } from './ParallaxArt';
import styles from './banner-artwork.module.css';

type Props = {
	/** The art crop and its height map's address. */
	src: string;
	depthSrc: string;
	/** The art's natural size, when the opener knows it; otherwise it is measured once loaded. */
	size: { width: number; height: number } | null;
	onClose: () => void;
};

/**
 * The whole art crop drawn with depth, as large as the screen allows: a banner shows only its
 * crop of the art. Full screen on every layout; back (phones), × or Escape closes it, and so does
 * a click beside the art.
 */
export function ParallaxArtViewer(props: Props) {
	useDocumentScrollLock();
	const container = useRef<HTMLDivElement>(null);
	const layer = useHotkeyLayer('dialog', { elementRef: container });
	// React events bubble out of a portal to the banner (a drag there crops it), so they end here.
	function stop(event: React.SyntheticEvent) {
		event.stopPropagation();
	}
	return createPortal(
		<div
			ref={container}
			className={styles.viewer}
			role="dialog"
			aria-modal="true"
			aria-label="Card art with depth"
			onPointerDown={stop}
			onPointerMove={stop}
			onPointerUp={stop}
			onClick={stop}
		>
			<HotkeyScope layer={layer}>
				<ParallaxArtViewerContents
					src={props.src}
					depthSrc={props.depthSrc}
					size={props.size}
					onClose={props.onClose}
				/>
			</HotkeyScope>
		</div>,
		document.body
	);
}

function ParallaxArtViewerContents(props: Props) {
	const { src, depthSrc, size, onClose } = props;
	useCloseOnEscape(onClose);
	const stage = useRef<HTMLDivElement>(null);
	const [bounds, setBounds] = useState({ width: 0, height: 0 });
	const [measured, setMeasured] = useState<{ width: number; height: number } | null>(null);
	const [active, setActive] = useState(false);
	const natural = size ?? measured;
	const width = natural ? natural.width : 0;
	const height = natural ? natural.height : 0;

	// Without a size from the opener, the art's own, once it has loaded.
	useEffect(() => {
		if (size) return;
		const image = new Image();
		image.onload = () => setMeasured({ width: image.naturalWidth, height: image.naturalHeight });
		image.src = src;
		return function () {
			image.onload = null;
		};
	}, [src, size]);

	useLayoutEffect(() => {
		const element = stage.current;
		if (!element) return;
		const measuredStage = element;
		function measure() {
			setBounds({ width: measuredStage.clientWidth, height: measuredStage.clientHeight });
		}
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(element);
		return function () {
			observer.disconnect();
		};
	}, []);

	// The art fits the stage (inside its padding) without cropping.
	const room = { width: Math.max(0, bounds.width - 32), height: Math.max(0, bounds.height - 32) };
	const fit = width && height && room.width && room.height ? Math.min(room.width / width, room.height / height) : 0;
	const artWidth = width * fit;
	const artHeight = height * fit;

	return (
		<>
			<header className={styles.viewerBar}>
				<HeaderBackSlot>
					<HeaderBackButton inline label="Close card art" onClick={onClose} />
				</HeaderBackSlot>
				<h2>Card art</h2>
				<button type="button" className={styles.viewerClose} aria-label="Close card art" onClick={onClose}>
					×
				</button>
			</header>
			<div
				ref={stage}
				className={styles.viewerStage}
				onClick={(event) => {
					if (event.target === event.currentTarget) onClose();
				}}
			>
				{fit ? (
					<div
						className={styles.viewerArt}
						style={{
							width: artWidth,
							height: artHeight,
							left: (bounds.width - artWidth) / 2,
							top: (bounds.height - artHeight) / 2
						}}
					>
						<img className={active ? styles.underParallax : undefined} src={src} alt="" draggable={false} />
						<ParallaxArt
							src={src}
							depthSrc={depthSrc}
							width={artWidth}
							height={artHeight}
							left={0}
							top={0}
							onActive={setActive}
							controls
						/>
					</div>
				) : null}
			</div>
		</>
	);
}
