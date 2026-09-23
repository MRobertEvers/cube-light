import React, { useEffect, useRef, useState } from 'react';
import {
	BannerFrame,
	MAX_MASKED_BANNER_X,
	clamp
} from '../../../../domain/appearance/banner-crop';
import styles from './banner-artwork.module.css';

type Props = {
	src: string | null;
	frame: BannerFrame;
	onChange?: (frame: BannerFrame) => void;
	label?: string;
	allowLeftBleed?: boolean;
};

export function BannerArtwork(props: Props) {
	const { src, frame, onChange, label, allowLeftBleed = false } = props;
	const viewport = useRef<HTMLDivElement>(null);
	const pointer = useRef<{ x: number; y: number; frame: BannerFrame } | null>(
		null
	);
	const [bounds, setBounds] = useState({ width: 0, height: 0 });
	const [natural, setNatural] = useState({ src: '', width: 0, height: 0 });

	useEffect(() => {
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

	const scale =
		natural.src === src &&
		natural.width &&
		natural.height &&
		bounds.width &&
		bounds.height
			? Math.max(
					bounds.width / natural.width,
					bounds.height / natural.height
				) * frame.zoom
			: 0;
	const width = natural.width * scale;
	const height = natural.height * scale;
	const horizontalOverflow = Math.max(0, width - bounds.width);
	const left =
		-horizontalOverflow * Math.min(frame.x, 1) -
		(allowLeftBleed ? Math.max(0, frame.x - 1) * bounds.width : 0);
	const top = (bounds.height - height) * frame.y;

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
			{src && (
				<img
					src={src}
					alt=""
					draggable={false}
					onLoad={(event) =>
						setNatural({
							src: src ?? '',
							width: event.currentTarget.naturalWidth,
							height: event.currentTarget.naturalHeight
						})
					}
					style={scale ? { width, height, left, top } : undefined}
				/>
			)}
		</div>
	);
}
