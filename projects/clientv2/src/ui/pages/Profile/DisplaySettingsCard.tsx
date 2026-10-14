import React, { useState } from 'react';
import { useAppDispatch } from '../../../redux/use-app-dispatch';
import { useAppSelector } from '../../../redux/use-app-selector';
import { selectParallaxArtSetting } from '../../../redux/parallax-art/parallax-art.selectors';
import { saveParallaxArt } from '../../../redux/parallax-art/parallax-art.thunks';
import { errorMessage } from '../../../redux/thunk';
import { parallaxSupported } from '../../kit/components/BannerArtwork/parallax-renderer';
import { usePrefersReducedMotion } from '../../kit/hooks/usePrefersReducedMotion';
import styles from './profile.module.css';

/**
 * How card art is drawn, saved on the profile so every device follows it: parallax art draws a
 * deck's banner art with depth (a height map the server makes), on devices that can.
 */
export function DisplaySettingsCard() {
	const dispatch = useAppDispatch();
	const enabled = useAppSelector(selectParallaxArtSetting);
	const reducedMotion = usePrefersReducedMotion();
	const [supported] = useState(parallaxSupported);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const note = !supported
		? 'This browser cannot draw it (it needs WebGL 2), so art stays flat here.'
		: reducedMotion
			? 'This device asks for reduced motion, so art stays flat here.'
			: null;
	return (
		<section className={`${styles.card} ${styles.device}`} aria-labelledby="display-heading">
			<h2 id="display-heading">Display</h2>
			<label className={styles.shellMode}>
				<input
					type="checkbox"
					checked={enabled === true}
					disabled={enabled === null || saving}
					onChange={function (event) {
						const next = event.target.checked;
						setSaving(true);
						setError(null);
						dispatch(saveParallaxArt(next))
							.catch((failure: unknown) => setError(errorMessage(failure, 'Unable to save the setting.')))
							.finally(() => setSaving(false));
					}}
				/>
				<span>
					<strong>Parallax art</strong>
					<span className={styles.shellDetail}>
						Deck banners show their card art with depth: it shifts as you move the pointer over it. The
						server makes each art’s depth map the first time it is shown, which takes a moment.
					</span>
					{note && <span className={styles.shellDetail}>{note}</span>}
				</span>
			</label>
			{error && (
				<p className={styles.error} role="alert">
					{error}
				</p>
			)}
		</section>
	);
}
