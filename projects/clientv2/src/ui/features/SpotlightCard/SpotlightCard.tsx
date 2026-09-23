import React from 'react';
import { BannerArtwork } from '../../kit/components/BannerArtwork/BannerArtwork';
import type { BannerCrop, BannerFrame } from '../../../domain/appearance/banner-crop';
import type { BannerBlend } from '../../../domain/appearance/banner-blend';
import { readableAccent } from '../../../domain/appearance/card-palette';
import styles from './spotlight-card.module.css';

export type SpotlightCardProps = {
	art: string | null;
	name: string;
	createdAt?: string;
	updatedAt?: string;
	artEdgeMode?: 'fade' | 'blend';
	crop?: BannerCrop;
	bannerBlend?: BannerBlend | null;
	tile?: boolean;
	onCropChange?: (variant: keyof BannerCrop, frame: BannerFrame) => void;
	variant?: 'responsive' | 'desktop' | 'mobile';
	preview?: boolean;
};

export function SpotlightCard(props: SpotlightCardProps) {
	const {
		art,
		name,
		createdAt,
		updatedAt,
		artEdgeMode = 'fade',
		crop,
		bannerBlend,
		tile = false,
		onCropChange,
		variant = 'responsive',
		preview = false
	} = props;
	const formatter = new Intl.DateTimeFormat(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
	const images = bannerBlend?.images;
	const surface = bannerBlend?.config.surface ?? '#f2e9e6';
	return (
		<div
			className={`${styles['spotlight-card-container']} ${styles[variant]}${preview ? ` ${styles.preview}` : ''}`}
		>
			<div
				className={styles['spotlight-card']}
				style={
					{
						'--spotlight-surface': surface,
						'--spotlight-ink': readableAccent('#302b29', surface)
					} as React.CSSProperties
				}
			>
				{art &&
					(!images || onCropChange) &&
					(crop ? (
						<>
							<div
								className={`${styles['spotlight-card-art']} ${styles[artEdgeMode]} ${styles.desktopCrop}`}
							>
								<BannerArtwork
									src={art}
									frame={crop.desktop}
									onChange={
										onCropChange
											? function (frame) {
													return onCropChange(
														'desktop',
														frame
													);
												}
											: undefined
									}
									label={
										onCropChange
											? 'Drag desktop banner art to reposition'
											: undefined
									}
									allowLeftBleed
								/>
							</div>
							<div
								className={`${styles['spotlight-card-art']} ${styles[artEdgeMode]} ${styles.mobileCrop}`}
							>
								<BannerArtwork
									src={art}
									frame={crop.mobile}
									onChange={
										onCropChange
											? function (frame) {
													return onCropChange(
														'mobile',
														frame
													);
												}
											: undefined
									}
									label={
										onCropChange
											? 'Drag mobile banner art to reposition'
											: undefined
									}
									allowLeftBleed
								/>
							</div>
						</>
					) : (
						<div
							className={`${styles['spotlight-card-art']} ${styles[artEdgeMode]}`}
						>
							<img src={art} alt="" />
						</div>
					))}
				{images &&
					(tile ? (
						<img
							className={styles.rendered}
							src={images.tile}
							alt=""
						/>
					) : (
						<>
							<img
								className={`${styles.rendered} ${styles.desktopCrop}`}
								src={images.desktop}
								alt=""
							/>
							<img
								className={`${styles.rendered} ${styles.mobileCrop}`}
								src={images.mobile}
								alt=""
							/>
						</>
					))}
				<div className={styles['spotlight-card-details']}>
					<h2>{name}</h2>
					{createdAt && updatedAt && (
						<div className={styles['spotlight-card-dates']}>
							<span>
								Created{' '}
								<time dateTime={createdAt}>
									{formatter.format(new Date(createdAt))}
								</time>
							</span>
							<span>
								Last edited{' '}
								<time dateTime={updatedAt}>
									{formatter.format(new Date(updatedAt))}
								</time>
							</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
