import React, { useEffect, useLayoutEffect } from 'react';
import { BackLink } from '../../kit/components/BackLink/BackLink';
import { Page } from '../../kit/components/Page/Page';
import { LoadingIndicator } from '../../kit/components/LoadingIndicator';
import { loadDeck } from '../../../redux/decks/decks.thunks';
import { selectDeck, selectDeckError } from '../../../redux/decks/decks.selectors';
import { useAppDispatch } from '../../../redux/use-app-dispatch';
import { useAppSelector } from '../../../redux/use-app-selector';
import { onAccent, readableAccent } from '../../../domain/appearance/card-palette';
import { useCardPalette } from '../../kit/utils/use-card-palette';
import { appearanceActions } from '../../../redux/appearance-settings/appearanceSettingsSlice';
import { appearanceView, selectAppearanceSettings } from '../../../redux/appearance-settings/appearance-settings.selectors';
import { BannerCardPickerModal } from './BannerCardPickerModal';
import {
	BannerCardSection,
	BlendSection,
	CropSection,
	PaletteSection,
	TopStyleSection,
	VisualizationSection
} from './DeckSettingsSections';
import styles from './deck-settings.module.css';
import { useHistoryModal } from '../../kit/hooks/useHistoryModal';
import { openBannerPicker } from '../../../redux/banner-picker/bannerPickerSlice';
import { type OpenBannerPickerPayload } from '../../../redux/banner-picker/banner-picker.types';
import { selectBannerPicker } from '../../../redux/banner-picker/banner-picker.selectors';

export type DeckSettingsPageProps = { deckId: string };

type DeckSettingsModal = {
	type: 'banner-picker';
	payload: OpenBannerPickerPayload;
};

export function DeckSettingsPage(props: DeckSettingsPageProps) {
	const { deckId } = props;
	const dispatch = useAppDispatch();
	const modalHistory = useHistoryModal<DeckSettingsModal>(
		`deck-settings:${deckId}`
	);
	const modal = modalHistory.value;
	const bannerPicker = useAppSelector(selectBannerPicker);
	const data = useAppSelector((root) =>
		selectDeck(root, deckId)
	);
	const loadError = useAppSelector(
		(root) =>
			selectDeckError(root, deckId)
	);
	const appearance = useAppSelector(selectAppearanceSettings);
	const showInitialLoading = !data && !loadError;
	const generatedPalette = useCardPalette(data?.icon);
	const view = appearanceView(appearance, deckId, data, generatedPalette);
	const { palette } = view;
	const paletteStyle = {
		'--deck-accent': palette.accent,
		'--deck-accent-text': readableAccent(palette.accent, '#ffffff'),
		'--deck-banner-ink': readableAccent(palette.accent, palette.surface),
		'--deck-on-accent': onAccent(palette.accent),
		'--deck-on-surface': onAccent(palette.surface),
		'--deck-surface': palette.surface,
		'--deck-wash': palette.wash,
		'--deck-border': palette.border
	} as React.CSSProperties;

	useEffect(() => {
		dispatch(appearanceActions.openAppearanceDeck(deckId));
		void dispatch(loadDeck(deckId));
	}, [deckId, dispatch]);

	useLayoutEffect(() => {
		if (
			modal?.type === 'banner-picker' &&
			(!bannerPicker.open || bannerPicker.deckId !== deckId)
		)
			dispatch(openBannerPicker(modal.payload));
	}, [bannerPicker.deckId, bannerPicker.open, deckId, dispatch, modal]);

	if (!data || showInitialLoading) {
		return (
			<Page>
				<main className={styles['loading']}>
					{!showInitialLoading && loadError ? (
						'Unable to load deck settings.'
					) : (
						<LoadingIndicator />
					)}
				</main>
			</Page>
		);
	}

	return (
		<Page>
			<main className={styles['page']} style={paletteStyle}>
				{/* Inside main so the modal inherits the deck palette variables. */}
				<BannerCardPickerModal
					deckId={deckId}
					deckName={data.name}
					open={modal?.type === 'banner-picker'}
					onClose={modalHistory.close}
					onSaved={() => {
						dispatch(appearanceActions.bannerSaved(deckId));
						modalHistory.close();
					}}
				/>
				<div className={styles['container']}>
					<BackLink to={`/deck/${deckId}`}>Back to deck</BackLink>
					<header className={styles['heading']}>
						<h1>Deck appearance</h1>
						<p>{data.name}</p>
					</header>
					<div className={styles['layout']}>
						<BannerCardSection
							deckId={deckId}
							data={data}
							view={view}
							onPickerOpened={(payload) =>
								modalHistory.open({
									type: 'banner-picker',
									payload
								})
							}
						/>
						<TopStyleSection
							deckId={deckId}
							data={data}
							view={view}
						/>
						<VisualizationSection
							deckId={deckId}
							data={data}
							view={view}
						/>
						<CropSection deckId={deckId} data={data} view={view} />
						<BlendSection deckId={deckId} data={data} view={view} />
						<PaletteSection
							deckId={deckId}
							data={data}
							view={view}
						/>
					</div>
				</div>
			</main>
		</Page>
	);
}
