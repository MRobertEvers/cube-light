import React from 'react';
import { Header } from '../../components/Header/Header';
import { useIsPhoneLayout } from '../../hooks/useIsPhoneLayout';
import type { BannerFrame } from '../../utils/banner-crop';
import { MobileDeckHeader } from './components/MobileDeckHeader/MobileDeckHeader';

type Props = {
	backSlotRef: React.Ref<HTMLDivElement>;
	name: string;
	art: string | null;
	artFrame: BannerFrame;
	banner: HTMLElement | null;
	isEditMode: boolean;
	onToggleEdit: () => void;
	isSaving: boolean;
	style?: React.CSSProperties;
};

/** The deck page's top bar: the site header, which phones swap for the deck's own. */
export function DeckHeader(props: Props) {
	const { backSlotRef, ...deck } = props;

	return useIsPhoneLayout() ? (
		<MobileDeckHeader backSlotRef={backSlotRef} {...deck} />
	) : (
		<Header backSlotRef={backSlotRef} />
	);
}
