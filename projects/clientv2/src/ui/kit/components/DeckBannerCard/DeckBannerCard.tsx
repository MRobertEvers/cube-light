import React from 'react';
import { BannerArtwork } from '../BannerArtwork/BannerArtwork';
import type { BannerCrop, BannerFrame } from '../../../../domain/appearance/banner-crop';
import { toFriendlyDate } from '../../utils/to-friendly-date';
import styles from './deck-banner-card.module.css';

type Props = {
	src: string | null;
	crop: BannerCrop;
	name: string;
	cardCount?: number;
	updatedAt: string;
	variant?: 'responsive' | 'desktop' | 'mobile';
	onEditDetails?: () => void;
	onCropChange?: (variant: keyof BannerCrop, frame: BannerFrame) => void;
	ref?: React.Ref<HTMLDivElement>;
};

export function DeckBannerCard(props: Props) {
	const {
		src,
		crop,
		name,
		cardCount,
		updatedAt,
		variant = 'responsive',
		onEditDetails,
		onCropChange,
		ref
	} = props;
	return (
		<div ref={ref} className={`${styles.card} ${styles[variant]}`}>
			<div className={styles.art}>
				<div className={styles.desktopArt}>
					<BannerArtwork
						src={src}
						frame={crop.desktop}
						onChange={
							onCropChange
								? function (frame) {
										return onCropChange('desktop', frame);
									}
								: undefined
						}
						label={
							onCropChange
								? 'Drag desktop banner art to reposition'
								: undefined
						}
					/>
				</div>
				<div className={styles.mobileArt}>
					<BannerArtwork
						src={src}
						frame={crop.mobile}
						onChange={
							onCropChange
								? function (frame) {
										return onCropChange('mobile', frame);
									}
								: undefined
						}
						label={
							onCropChange
								? 'Drag mobile banner art to reposition'
								: undefined
						}
					/>
				</div>
			</div>
			<div className={styles.info}>
				<div className={styles.titleRow}>
					{onEditDetails ? (
						<button
							type="button"
							className={styles.titleButton}
							onClick={onEditDetails}
							aria-label="Edit deck details"
						>
							{name}
						</button>
					) : (
						<h2 className={styles.title}>{name}</h2>
					)}
					{cardCount !== undefined && (
						<span className={styles.cardCount}>
							{cardCount} {cardCount === 1 ? 'card' : 'cards'}
						</span>
					)}
				</div>
				<span className={styles.subtitle}>
					Updated <strong>{toFriendlyDate(updatedAt)}</strong>
				</span>
			</div>
		</div>
	);
}
