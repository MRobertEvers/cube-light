import React from 'react';
import { Header } from '../../kit/components/Header/Header';
import type { BannerFrame } from '../../../domain/appearance/banner-crop';
import type { ArtworkInfo } from '../../../domain/appearance/artwork';
import styles from './deck-header.module.css';

type Props = {
	backSlotRef: React.Ref<HTMLDivElement>;
	name: string;
	art: string | null;
	artInfo: ArtworkInfo | null;
	artFrame: BannerFrame;
	banner: HTMLElement | null;
	style?: React.CSSProperties;
};

/**
 * The deck page's top bar: the site header showing the deck's name, which on phones
 * turns into a compact banner for the deck as the deck's banner scrolls under it.
 */
export function DeckHeader(props: Props) {
	const { backSlotRef, name, art, artInfo, artFrame, banner, style } = props;

	return (
		<Header
			backSlotRef={backSlotRef}
			identity={{
				name: name,
				art: art,
				artInfo: artInfo,
				artFrame: artFrame,
				banner: banner
			}}
			style={style}
			chrome={{ desktop: <span className={styles.name}>{name}</span> }}
		/>
	);
}
