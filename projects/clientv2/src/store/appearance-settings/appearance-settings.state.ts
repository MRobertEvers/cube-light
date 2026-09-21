import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchAPISetDeckPalette } from '../../api/fetch-api-set-deck-palette';
import { fetchAPISetBannerCrop } from '../../api/fetch-api-set-banner-crop';
import { fetchAPISetTopStyle } from '../../api/fetch-api-set-top-style';
import type { GetDeckResponse } from '../../workers/deck.worker.messages';
import { withMinimumStatusDuration } from '../../utils/minimum-status-duration';
import { CardPalette, DEFAULT_CARD_PALETTE } from '../../utils/card-palette';
import { BannerCrop, DEFAULT_BANNER_CROP } from '../../utils/banner-crop';
import type { DeckTopStyle } from '../../utils/deck-top-style';
import { loadDeck } from '../decks/decks.state';
import { DEFAULT_BANNER_BLEND, type BannerBlendConfig } from '../../utils/banner-blend';
import { generateAndSaveBannerBlend } from '../../utils/generate-banner-blend';

type Section = 'palette' | 'crop' | 'style' | 'banner' | 'blend';
type Status = { saving: boolean; message: string | null; error: string | null };
type PaletteDraft = { value: CardPalette | null } | null;

export type AppearanceSettingsState = {
	deckId: string | null;
	paletteDraft: PaletteDraft;
	cropDraft: BannerCrop | null;
	styleDraft: DeckTopStyle | null;
	blendDraft: BannerBlendConfig | null;
	status: Record<Section, Status>;
};

const emptyStatus = (): Status => ({ saving: false, message: null, error: null });
const initialState = (): AppearanceSettingsState => ({
	deckId: null, paletteDraft: null, cropDraft: null, styleDraft: null, blendDraft: null,
	status: { palette: emptyStatus(), crop: emptyStatus(), style: emptyStatus(), banner: emptyStatus(), blend: emptyStatus() }
});

export const savePalette = createAsyncThunk('appearanceSettings/savePalette',
	async (args: { deckId: string; palette: CardPalette | null }, context) => {
		const { deckId, palette } = args;
		const { dispatch } = context;
		await withMinimumStatusDuration(async () => {
			await fetchAPISetDeckPalette(deckId, palette);
			await dispatch(loadDeck(deckId)).unwrap();
		});
	});

export const saveCrop = createAsyncThunk('appearanceSettings/saveCrop',
	async (args: { deckId: string; crop: BannerCrop }, context) => {
		const { deckId, crop } = args;
		const { dispatch } = context;
		await withMinimumStatusDuration(async () => {
			await fetchAPISetBannerCrop(deckId, crop);
			const deck = await dispatch(loadDeck(deckId)).unwrap();
			if (deck.icon) await generateAndSaveBannerBlend(deckId, deck, undefined,
				(message) => dispatch(appearanceActions.renderProgress({ deckId, section: 'crop', message })));
			await dispatch(loadDeck(deckId)).unwrap();
		});
	});

export const saveBlend = createAsyncThunk('appearanceSettings/saveBlend',
	async (args: { deckId: string; config: BannerBlendConfig }, context) => {
		const { deckId, config } = args;
		const { dispatch } = context;
		const deck = await dispatch(loadDeck(deckId)).unwrap();
		await generateAndSaveBannerBlend(deckId, deck, config,
			(message) => dispatch(appearanceActions.renderProgress({ deckId, section: 'blend', message })));
		await dispatch(loadDeck(deckId)).unwrap();
	});

export const saveStyle = createAsyncThunk('appearanceSettings/saveStyle',
	async (args: { deckId: string; style: DeckTopStyle }, context) => {
		const { deckId, style } = args;
		const { dispatch } = context;
		await withMinimumStatusDuration(async () => {
			await fetchAPISetTopStyle(deckId, style);
			await dispatch(loadDeck(deckId)).unwrap();
		});
	});

export const appearanceSettingsSlice = createSlice({
	name: 'appearanceSettings', initialState: initialState(),
	reducers: {
		openAppearanceDeck(state, action: PayloadAction<string>) {
			if (state.deckId !== action.payload) Object.assign(state, initialState(), { deckId: action.payload });
		},
		changePaletteColor(state, action: PayloadAction<{ key: keyof CardPalette; value: string; palette: CardPalette }>) {
			state.paletteDraft = { value: { ...action.payload.palette, [action.payload.key]: action.payload.value } };
			state.status.palette = emptyStatus();
		},
		useCardColors(state) { state.paletteDraft = { value: null }; state.status.palette = emptyStatus(); },
		changeCrop(state, action: PayloadAction<BannerCrop>) { state.cropDraft = action.payload; state.status.crop = emptyStatus(); },
		changeStyle(state, action: PayloadAction<DeckTopStyle>) { state.styleDraft = action.payload; state.status.style = emptyStatus(); },
		changeBlend(state, action: PayloadAction<BannerBlendConfig>) { state.blendDraft = action.payload; state.status.blend = emptyStatus(); },
		renderProgress(state, action: PayloadAction<{ deckId: string; section: 'blend' | 'crop'; message: string }>) {
			if (state.deckId === action.payload.deckId) state.status[action.payload.section].message = action.payload.message;
		},
		bannerSaved(state, action: PayloadAction<string>) {
			if (state.deckId !== action.payload) return;
			state.cropDraft = null;
			state.status.banner = { saving: false, message: 'Banner artwork saved.', error: null };
		},
		bannerPickerOpened(state) { state.status.banner = emptyStatus(); }
	},
	extraReducers: (builder) => {
		builder
			.addCase(saveBlend.pending, (state, action) => { if (state.deckId === action.meta.arg.deckId) state.status.blend = { saving: true, message: 'Preparing banners…', error: null }; })
			.addCase(saveBlend.fulfilled, (state, action) => {
				if (state.deckId !== action.meta.arg.deckId) return;
				state.blendDraft = null;
				state.status.blend = { saving: false, message: 'Blend saved. Future visits use the generated images.', error: null };
			})
			.addCase(saveBlend.rejected, (state, action) => {
				if (state.deckId === action.meta.arg.deckId) state.status.blend = { saving: false, message: null, error: action.error.message ?? 'Unable to generate banners. Please try again.' };
			})
			.addCase(savePalette.pending, (state, action) => { if (state.deckId === action.meta.arg.deckId) state.status.palette = { saving: true, message: null, error: null }; })
			.addCase(savePalette.fulfilled, (state, action) => {
				if (state.deckId !== action.meta.arg.deckId) return;
				state.paletteDraft = null;
				state.status.palette = { saving: false, message: 'Palette saved.', error: null };
			})
			.addCase(savePalette.rejected, (state, action) => {
				if (state.deckId !== action.meta.arg.deckId) return;
				state.status.palette = { saving: false, message: null, error: 'Unable to save the palette. Your changes are still here; please try again.' };
			})
			.addCase(saveCrop.pending, (state, action) => { if (state.deckId === action.meta.arg.deckId) state.status.crop = { saving: true, message: null, error: null }; })
			.addCase(saveCrop.fulfilled, (state, action) => {
				if (state.deckId !== action.meta.arg.deckId) return;
				state.cropDraft = null;
				state.status.crop = { saving: false, message: 'Banner crop saved.', error: null };
			})
			.addCase(saveCrop.rejected, (state, action) => {
				if (state.deckId !== action.meta.arg.deckId) return;
				state.status.crop = { saving: false, message: null, error: action.error.message ?? 'Unable to save the banner crop and blend. Please try again.' };
			})
			.addCase(saveStyle.pending, (state, action) => { if (state.deckId === action.meta.arg.deckId) state.status.style = { saving: true, message: null, error: null }; })
			.addCase(saveStyle.fulfilled, (state, action) => {
				if (state.deckId !== action.meta.arg.deckId) return;
				state.styleDraft = null;
				state.status.style = { saving: false, message: 'Deck top style saved.', error: null };
			})
			.addCase(saveStyle.rejected, (state, action) => {
				if (state.deckId !== action.meta.arg.deckId) return;
				state.status.style = { saving: false, message: null, error: 'Unable to save the top style. Your selection is still here; please try again.' };
			});
	}
});

export const appearanceActions = appearanceSettingsSlice.actions;
export const selectAppearanceSettings = (state: { appearanceSettings: AppearanceSettingsState }) => state.appearanceSettings;

function samePalette(a: CardPalette | null, b: CardPalette | null): boolean {
	if (!a || !b) return a === b;
	return a.accent === b.accent && a.surface === b.surface && a.wash === b.wash && a.border === b.border;
}

function sameCrop(a: BannerCrop, b: BannerCrop): boolean {
	return (['desktop', 'mobile'] as const).every((variant) =>
		a[variant].x === b[variant].x && a[variant].y === b[variant].y && a[variant].zoom === b[variant].zoom);
}

export function appearanceView(state: AppearanceSettingsState, deckId: string, deck: GetDeckResponse | undefined, generatedPalette: CardPalette | null) {
	const active = state.deckId === deckId ? state : initialState();
	const selectedPalette = active.paletteDraft ? active.paletteDraft.value : deck?.palette ?? null;
	const palette = selectedPalette ?? generatedPalette ?? DEFAULT_CARD_PALETTE;
	const crop = active.cropDraft ?? deck?.bannerCrop ?? DEFAULT_BANNER_CROP;
	const style = active.styleDraft ?? deck?.topStyle ?? 'card';
	const blend = active.blendDraft ?? deck?.bannerBlend?.config ?? DEFAULT_BANNER_BLEND;
	return {
		blend,
		palette, selectedPalette, isAuto: selectedPalette === null,
		paletteChanged: !!deck && !!active.paletteDraft && !samePalette(selectedPalette, deck.palette),
		crop, cropChanged: !!deck && !!active.cropDraft && !sameCrop(crop, deck.bannerCrop ?? DEFAULT_BANNER_CROP),
		style, styleChanged: !!deck && style !== (deck.topStyle ?? 'card'), status: active.status
	};
}
