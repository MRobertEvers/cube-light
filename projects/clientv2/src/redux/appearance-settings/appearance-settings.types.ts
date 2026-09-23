import type { BoardVisualizationId } from '../../domain/appearance/board-visualization';
import type { CardPalette } from '../../domain/appearance/card-palette';
import type { BannerCrop } from '../../domain/appearance/banner-crop';
import type { DeckTopStyle } from '../../domain/appearance/deck-top-style';
import type { BannerBlendConfig } from '../../domain/appearance/banner-blend';

export type AppearanceSection =
	| 'palette'
	| 'crop'
	| 'style'
	| 'visualization'
	| 'banner'
	| 'blend';
export type AppearanceStatus = {
	saving: boolean;
	message: string | null;
	error: string | null;
	progress?: number | null;
};
export type PaletteDraft = { value: CardPalette | null } | null;

export type AppearanceSettingsState = {
	deckId: string | null;
	paletteDraft: PaletteDraft;
	cropDraft: BannerCrop | null;
	styleDraft: DeckTopStyle | null;
	visualizationDraft: BoardVisualizationId | null;
	blendDraft: BannerBlendConfig | null;
	status: Record<AppearanceSection, AppearanceStatus>;
};
