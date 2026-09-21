import React from 'react';
import { BannerArtwork } from '../BannerArtwork/BannerArtwork';
import type { BannerCrop, BannerFrame } from '../../utils/banner-crop';
import { toFriendlyDate } from '../../utils/to-friendly-date';
import styles from './deck-full-art-top.module.css';

type Props = {
	src: string | null;
	crop: BannerCrop;
	name: string;
	updatedAt?: string;
	variant?: 'responsive' | 'desktop' | 'mobile';
	onEditDetails?: () => void;
	onCropChange?: (variant: keyof BannerCrop, frame: BannerFrame) => void;
};

export function DeckFullArtTop(props: Props) {
	const { src, crop, name, updatedAt, variant = 'responsive', onEditDetails, onCropChange } = props;
	return <div className={`${styles.top} ${styles[variant]}`}>
		<div className={styles.desktopArt}><BannerArtwork src={src} frame={crop.desktop} onChange={onCropChange ? (frame) => onCropChange('desktop', frame) : undefined} label={onCropChange ? 'Drag desktop background art to reposition' : undefined} /></div>
		<div className={styles.mobileArt}><BannerArtwork src={src} frame={crop.mobile} onChange={onCropChange ? (frame) => onCropChange('mobile', frame) : undefined} label={onCropChange ? 'Drag mobile background art to reposition' : undefined} /></div>
		<div className={styles.fade} />
		<div className={styles.content}>
			{onEditDetails ? <button type="button" className={styles.titleButton} onClick={onEditDetails} aria-label="Edit deck details">{name}</button>
				: <h2 className={styles.title}>{name}</h2>}
			{updatedAt && <span className={styles.subtitle}>Updated <strong>{toFriendlyDate(updatedAt)}</strong></span>}
		</div>
	</div>;
}
