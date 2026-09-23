import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { BoardVisualizationId } from '../../domain/appearance/board-visualization';
import type { CardPalette } from '../../domain/appearance/card-palette';
import type { BannerCrop } from '../../domain/appearance/banner-crop';
import type { DeckTopStyle } from '../../domain/appearance/deck-top-style';
import type { BannerBlendConfig } from '../../domain/appearance/banner-blend';
import { saveBlend, saveCrop, savePalette, saveStyle, saveVisualization } from './appearance-settings.thunks';
import type { AppearanceSettingsState, AppearanceStatus } from './appearance-settings.types';

function emptyStatus(): AppearanceStatus {
	return {
		saving: false,
		message: null,
		error: null
	};
}
export function initialAppearanceSettings(): AppearanceSettingsState {
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

export const appearanceSettingsSlice = createSlice({
	name: 'appearanceSettings',
	initialState: initialAppearanceSettings(),
	reducers: {
		openAppearanceDeck: function (state, action: PayloadAction<string>) {
			if (state.deckId !== action.payload)
				Object.assign(state, initialAppearanceSettings(), {
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
