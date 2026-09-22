import React from 'react';
import { Header } from '../../components/Header/Header';
import { useIsPhoneLayout } from '../../hooks/useIsPhoneLayout';
import type { BannerFrame } from '../../utils/banner-crop';
import { MobileDeckHeader } from './components/MobileDeckHeader/MobileDeckHeader';
import styles from './deck-header.module.css';

type Props = {
	backSlotRef: React.Ref<HTMLDivElement>;
	name: string;
	art: string | null;
	artFrame: BannerFrame;
	banner: HTMLElement | null;
	style?: React.CSSProperties;
};

/** The deck page's top bar: the site header, which phones swap for the deck's own. */
export function DeckHeader(props: Props) {
	const { backSlotRef, name, art, artFrame, banner, style } = props;

	return useIsPhoneLayout() ? (
		<MobileDeckHeader
			backSlotRef={backSlotRef}
			name={name}
			art={art}
			artFrame={artFrame}
			banner={banner}
			style={style}
		/>
	) : (
		<Header backSlotRef={backSlotRef}>
			<span className={styles.name}>{name}</span>
		</Header>
	);
}
