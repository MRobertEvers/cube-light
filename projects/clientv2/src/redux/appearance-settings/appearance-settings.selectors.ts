import type { RootState } from '../root-reducers';
import { boardVisualizationIdOf } from '../../domain/appearance/board-visualization';
import type { GroupedDeck } from '../../domain/deck/grouping';
import { CardPalette, DEFAULT_CARD_PALETTE } from '../../domain/appearance/card-palette';
import { BannerCrop, DEFAULT_BANNER_CROP } from '../../domain/appearance/banner-crop';
import { normalizeBannerBlendConfig } from '../../domain/appearance/banner-blend';
import { initialAppearanceSettings } from './appearanceSettingsSlice';
import type { AppearanceSettingsState } from './appearance-settings.types';

export function selectAppearanceSettings(state: RootState) {
	return state.appearanceSettings;
}

function samePalette(a: CardPalette | null, b: CardPalette | null): boolean {
	if (!a || !b) return a === b;
	return (
		a.accent === b.accent &&
		a.surface === b.surface &&
		a.wash === b.wash &&
		a.border === b.border
	);
}

function sameCrop(a: BannerCrop, b: BannerCrop): boolean {
	return (['desktop', 'mobile'] as const).every(
		(variant) =>
			a[variant].x === b[variant].x &&
			a[variant].y === b[variant].y &&
			a[variant].zoom === b[variant].zoom
	);
}

/** The deck's appearance as the settings page shows it: saved values with any drafts on top. */
export function appearanceView(
	state: AppearanceSettingsState,
	deckId: string,
	deck: GroupedDeck | undefined,
	generatedPalette: CardPalette | null
) {
	const active = state.deckId === deckId ? state : initialAppearanceSettings();
	const selectedPalette = active.paletteDraft
		? active.paletteDraft.value
		: (deck?.palette ?? null);
	const palette = selectedPalette ?? generatedPalette ?? DEFAULT_CARD_PALETTE;
	const crop = active.cropDraft ?? deck?.bannerCrop ?? DEFAULT_BANNER_CROP;
	const style = active.styleDraft ?? deck?.topStyle ?? 'card';
	const savedVisualization = boardVisualizationIdOf(deck?.boardVisualization);
	const visualization = active.visualizationDraft ?? savedVisualization;
	const savedBlend = normalizeBannerBlendConfig(deck?.bannerBlend?.config);
	const blend = active.blendDraft ?? savedBlend;
	return {
		blend,
		savedBlend,
		blendChanged:
			!!active.blendDraft &&
			JSON.stringify(active.blendDraft) !== JSON.stringify(savedBlend),
		palette,
		selectedPalette,
		isAuto: selectedPalette === null,
		paletteChanged:
			!!deck &&
			!!active.paletteDraft &&
			!samePalette(selectedPalette, deck.palette),
		crop,
		cropChanged:
			!!deck &&
			!!active.cropDraft &&
			!sameCrop(crop, deck.bannerCrop ?? DEFAULT_BANNER_CROP),
		style,
		styleChanged: !!deck && style !== (deck.topStyle ?? 'card'),
		visualization,
		visualizationChanged: !!deck && visualization !== savedVisualization,
		status: active.status
	};
}
