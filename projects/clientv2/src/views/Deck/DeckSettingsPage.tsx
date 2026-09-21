import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Page } from '../../components/Page/Page';
import { LoadingIndicator } from '../../components/LoadingIndicator';
import {
	loadDeck,
	selectDeck,
	selectDeckError
} from '../../store/decks/decks.state';
import { useAppDispatch } from '../../store/use-app-dispatch';
import {
	onAccent,
	readableAccent,
	useCardPalette
} from '../../utils/card-palette';
import { useMinimumVisible } from '../../hooks/useMinimumVisible';
import {
	appearanceActions,
	appearanceView,
	selectAppearanceSettings
} from '../../store/appearance-settings/appearance-settings.state';
import { BannerCardPickerModal } from './BannerCardPickerModal';
import {
	BannerCardSection,
	BlendSection,
	CropSection,
	PaletteSection,
	TopStyleSection
} from './DeckSettingsSections';
import styles from './deck-settings.module.css';

export type DeckSettingsPageProps = { deckId: string };

export function DeckSettingsPage(props: DeckSettingsPageProps) {
	const { deckId } = props;
	const dispatch = useAppDispatch();
	const data = useSelector((root: Parameters<typeof selectDeck>[0]) =>
		selectDeck(root, deckId)
	);
	const loadError = useSelector(
		(root: Parameters<typeof selectDeckError>[0]) =>
			selectDeckError(root, deckId)
	);
	const appearance = useSelector(selectAppearanceSettings);
	const showInitialLoading = useMinimumVisible(!data && !loadError);
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
			<BannerCardPickerModal
				deckId={deckId}
				deckName={data.name}
				onSaved={() => dispatch(appearanceActions.bannerSaved(deckId))}
			/>
			<main className={styles['page']} style={paletteStyle}>
				<div className={styles['container']}>
					<Link
						className={styles['back-link']}
						to={`/deck/${deckId}`}
					>
						← Back to deck
					</Link>
					<header className={styles['heading']}>
						<h1>Deck appearance</h1>
						<p>{data.name}</p>
					</header>
					<div className={styles['layout']}>
						<BannerCardSection
							deckId={deckId}
							data={data}
							view={view}
						/>
						<TopStyleSection
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
