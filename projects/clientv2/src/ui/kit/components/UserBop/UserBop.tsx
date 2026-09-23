import React from 'react';
import type { UserProfile } from '../../../../domain/models/session';
import { BannerArtwork } from '../BannerArtwork/BannerArtwork';
import styles from './user-bop.module.css';

type Props = {
	profile: UserProfile | null;
	size?: 'header' | 'preview';
	onCropChange?: (crop: UserProfile['crop']) => void;
};

/** The user's circular identity image, cropped from their chosen card artwork. */
export function UserBop(props: Props) {
	const { profile, size = 'header', onCropChange } = props;
	return (
		<div
			className={`${styles.bop} ${styles[size]}`}
			aria-label={
				onCropChange ? 'Drag profile artwork to reposition' : undefined
			}
		>
			{profile ? (
				<BannerArtwork
					src={profile.art}
					frame={profile.crop}
					onChange={onCropChange}
				/>
			) : (
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path d="M12 12.2a4.35 4.35 0 1 0 0-8.7 4.35 4.35 0 0 0 0 8.7Zm0 2.1c-4.35 0-7.9 2.35-7.9 5.25 0 .52.43.95.95.95h13.9c.52 0 .95-.43.95-.95 0-2.9-3.55-5.25-7.9-5.25Z" />
				</svg>
			)}
		</div>
	);
}
