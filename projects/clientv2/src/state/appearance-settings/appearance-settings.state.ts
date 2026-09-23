import { createAppThunk } from '../thunk';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
	boardVisualizationIdOf,
	type BoardVisualizationId
} from '../../domain/appearance/board-visualization';
import type { GroupedDeck } from '../../domain/deck/grouping';
import { CardPalette, DEFAULT_CARD_PALETTE } from '../../domain/appearance/card-palette';
import { BannerCrop, DEFAULT_BANNER_CROP } from '../../domain/appearance/banner-crop';
import type { DeckTopStyle } from '../../domain/appearance/deck-top-style';
import {
	normalizeBannerBlendConfig,
	type BannerBlendConfig
} from '../../domain/appearance/banner-blend';

type Section =
	| 'palette'
	| 'crop'
	| 'style'
	| 'visualization'
	| 'banner'
	| 'blend';
type Status = {
	saving: boolean;
	message: string | null;
	error: string | null;
	progress?: number | null;
};
type PaletteDraft = { value: CardPalette | null } | null;

export type AppearanceSettingsState = {
	deckId: string | null;
	paletteDraft: PaletteDraft;
	cropDraft: BannerCrop | null;
	styleDraft: DeckTopStyle | null;
	visualizationDraft: BoardVisualizationId | null;
	blendDraft: BannerBlendConfig | null;
	status: Record<Section, Status>;
};

function emptyStatus(): Status {
	return {
		saving: false,
		message: null,
		error: null
	};
}
function initialState(): AppearanceSettingsState {
	return {
		deckId: null,
		paletteDraft: null,
		cropDraft: null,
		styleDraft: null,
		visualizationDraft: null,
		blendDraft: null,
		status: {
			palette: emptyStatus(),
			crop: emptyStatus(),
			style: emptyStatus(),
			visualization: emptyStatus(),
			banner: emptyStatus(),
			blend: emptyStatus()
		}
	};
}

export const savePalette = createAppThunk(
	'appearanceSettings/savePalette',
	async (args: { deckId: string; palette: CardPalette | null }, context) => {
		const { deckId, palette } = args;
		const { decks } = context.extra;
		await decks.setPalette(deckId, palette);
	}
);

/** Moves the artwork and re-renders the banner with the blend and subject settings in place. */
export const saveCrop = createAppThunk(
	'appearanceSettings/saveCrop',
	async (
		args: { deckId: string; crop: BannerCrop; config: BannerBlendConfig },
		context
	) => {
		const { deckId, crop, config } = args;
		const { dispatch } = context;
		await context.extra.banners.crop(deckId, crop, config, (message, progress) =>
			dispatch(appearanceActions.renderProgress({ deckId, section: 'crop', message, progress }))
		);
	}
);

export const saveBlend = createAppThunk(
	'appearanceSettings/saveBlend',
	async (args: { deckId: string; config: BannerBlendConfig }, context) => {
		const { deckId, config } = args;
		const { dispatch } = context;
		await context.extra.banners.render(deckId, config, (message, progress) =>
			dispatch(appearanceActions.renderProgress({ deckId, section: 'blend', message, progress }))
		);
	}
);

export const saveStyle = createAppThunk(
	'appearanceSettings/saveStyle',
	async (args: { deckId: string; style: DeckTopStyle }, context) => {
		const { deckId, style } = args;
		const { decks } = context.extra;
		await decks.setTopStyle(deckId, style);
	}
);

export const saveVisualization = createAppThunk(
	'appearanceSettings/saveVisualization',
	async (
		args: { deckId: string; visualization: BoardVisualizationId },
		context
	) => {
		const { deckId, visualization } = args;
		const { decks } = context.extra;
		await decks.setBoardVisualization(deckId, visualization);
	}
);

export const appearanceSettingsSlice = createSlice({
	name: 'appearanceSettings',
	initialState: initialState(),
	reducers: {
		openAppearanceDeck: function (state, action: PayloadAction<string>) {
			if (state.deckId !== action.payload)
				Object.assign(state, initialState(), {
					deckId: action.payload
				});
		},
		changePaletteColor: function (
			state,
			action: PayloadAction<{
				key: keyof CardPalette;
				value: string;
				palette: CardPalette;
			}>
		) {
			state.paletteDraft = {
				value: {
					...action.payload.palette,
					[action.payload.key]: action.payload.value
				}
			};
			state.status.palette = emptyStatus();
		},
		useCardColors: function (state) {
			state.paletteDraft = { value: null };
			state.status.palette = emptyStatus();
		},
		changeCrop: function (state, action: PayloadAction<BannerCrop>) {
			state.cropDraft = action.payload;
			state.status.crop = emptyStatus();
		},
		changeStyle: function (state, action: PayloadAction<DeckTopStyle>) {
			state.styleDraft = action.payload;
			state.status.style = emptyStatus();
		},
		changeVisualization: function (
			state,
			action: PayloadAction<BoardVisualizationId>
		) {
			state.visualizationDraft = action.payload;
			state.status.visualization = emptyStatus();
		},
		changeBlend: function (
			state,
			action: PayloadAction<BannerBlendConfig>
		) {
			state.blendDraft = action.payload;
			state.status.blend = emptyStatus();
		},
		renderProgress: function (
			state,
			action: PayloadAction<{
				deckId: string;
				section: 'blend' | 'crop';
				message: string;
				progress?: number;
			}>
		) {
			if (state.deckId !== action.payload.deckId) return;
			state.status[action.payload.section].message =
				action.payload.message;
			state.status[action.payload.section].progress =
				action.payload.progress ?? null;
		},
		bannerSaved: function (state, action: PayloadAction<string>) {
			if (state.deckId !== action.payload) return;
			state.cropDraft = null;
			state.status.banner = {
				saving: false,
				message: 'Banner artwork saved.',
				error: null
			};
		},
		bannerPickerOpened: function (state) {
			state.status.banner = emptyStatus();
		}
	},
	extraReducers: function (builder) {
		builder
			.addCase(saveBlend.pending, (state, action) => {
				if (state.deckId === action.meta.arg.deckId)
					state.status.blend = {
						saving: true,
						message: 'Preparing banners…',
						error: null
					};
			})
			.addCase(saveBlend.fulfilled, (state, action) => {
				if (state.deckId !== action.meta.arg.deckId) return;
				state.blendDraft = null;
				state.status.blend = {
					saving: false,
					message:
						'Blend saved. Future visits use the generated images.',
					error: null
				};
			})
			.addCase(saveBlend.rejected, (state, action) => {
				if (state.deckId !== action.meta.arg.deckId) return;
				// A newer generation replaced this one; its result is discarded, not an error.
				state.status.blend =
					action.error.name === 'BannerBlendCancelled'
						? {
								saving: false,
								message: 'Replaced by a newer banner request.',
								error: null
							}
						: {
								saving: false,
								message: null,
								error:
									action.error.message ??
									'Unable to generate banners. Please try again.'
							};
			})
			.addCase(savePalette.pending, (state, action) => {
				if (state.deckId === action.meta.arg.deckId)
					state.status.palette = {
						saving: true,
						message: null,
						error: null
					};
			})
			.addCase(savePalette.fulfilled, (state, action) => {
				if (state.deckId !== action.meta.arg.deckId) return;
				state.paletteDraft = null;
				state.status.palette = {
					saving: false,
					message: 'Palette saved.',
					error: null
				};
			})
			.addCase(savePalette.rejected, (state, action) => {
				if (state.deckId !== action.meta.arg.deckId) return;
				state.status.palette = {
					saving: false,
					message: null,
					error: 'Unable to save the palette. Your changes are still here; please try again.'
				};
			})
			.addCase(saveCrop.pending, (state, action) => {
				if (state.deckId === action.meta.arg.deckId)
					state.status.crop = {
						saving: true,
						message: null,
						error: null
					};
			})
			.addCase(saveCrop.fulfilled, (state, action) => {
				if (state.deckId !== action.meta.arg.deckId) return;
				state.cropDraft = null;
				state.blendDraft = null;
				state.status.crop = {
					saving: false,
					message: 'Banner crop saved.',
					error: null
				};
			})
			.addCase(saveCrop.rejected, (state, action) => {
				if (state.deckId !== action.meta.arg.deckId) return;
				state.status.crop =
					action.error.name === 'BannerBlendCancelled'
						? {
								saving: false,
								message:
									'Crop saved; its banner render was replaced by a newer request.',
								error: null
							}
						: {
								saving: false,
								message: null,
								error:
									action.error.message ??
									'Unable to save the banner crop and blend. Please try again.'
							};
			})
			.addCase(saveStyle.pending, (state, action) => {
				if (state.deckId === action.meta.arg.deckId)
					state.status.style = {
						saving: true,
						message: null,
						error: null
					};
			})
			.addCase(saveStyle.fulfilled, (state, action) => {
				if (state.deckId !== action.meta.arg.deckId) return;
				state.styleDraft = null;
				state.status.style = {
					saving: false,
					message: 'Deck top style saved.',
					error: null
				};
			})
			.addCase(saveStyle.rejected, (state, action) => {
				if (state.deckId !== action.meta.arg.deckId) return;
				state.status.style = {
					saving: false,
					message: null,
					error: 'Unable to save the top style. Your selection is still here; please try again.'
				};
			})
			.addCase(saveVisualization.pending, (state, action) => {
				if (state.deckId === action.meta.arg.deckId)
					state.status.visualization = {
						saving: true,
						message: null,
						error: null
					};
			})
			.addCase(saveVisualization.fulfilled, (state, action) => {
				if (state.deckId !== action.meta.arg.deckId) return;
				state.visualizationDraft = null;
				state.status.visualization = {
					saving: false,
					message: 'Card view saved.',
					error: null
				};
			})
			.addCase(saveVisualization.rejected, (state, action) => {
				if (state.deckId !== action.meta.arg.deckId) return;
				state.status.visualization = {
					saving: false,
					message: null,
					error: 'Unable to save the card view. Your selection is still here; please try again.'
				};
			});
	}
});

export const appearanceActions = appearanceSettingsSlice.actions;
export function selectAppearanceSettings(state: {
	appearanceSettings: AppearanceSettingsState;
}) {
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

export function appearanceView(
	state: AppearanceSettingsState,
	deckId: string,
	deck: GroupedDeck | undefined,
	generatedPalette: CardPalette | null
) {
	const active = state.deckId === deckId ? state : initialState();
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
