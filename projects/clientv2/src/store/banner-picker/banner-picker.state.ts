import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
	CardPrinting,
	fetchAPICardPrintings
} from '../../api/fetch-api-card-printings';
import { fetchAPIUpdateDeck } from '../../api/fetch-api-update-deck';
import { generateAndSaveBannerBlend } from '../../utils/generate-banner-blend';
import {
	configForNewArtwork,
	normalizeBannerBlendConfig
} from '../../utils/banner-blend';
import { isMobileDevice } from '../../utils/is-mobile-device';
import { loadDeck } from '../decks/decks.state';

export type BannerPickerState = {
	open: boolean;
	deckId: string | null;
	names: string[];
	deckCardUuids: string[];
	query: string;
	chosenName: string;
	currentName: string;
	selectedUuid: string | null;
	currentUuid: string | null;
	printings: CardPrinting[];
	loading: boolean;
	error: string | null;
	requestId: string | null;
	suggestionsOpen: boolean;
	saving: boolean;
	saveError: string | null;
};

const initialState: BannerPickerState = {
	open: false,
	deckId: null,
	names: [],
	deckCardUuids: [],
	query: '',
	chosenName: '',
	currentName: '',
	selectedUuid: null,
	currentUuid: null,
	printings: [],
	loading: false,
	error: null,
	requestId: null,
	suggestionsOpen: false,
	saving: false,
	saveError: null
};

export const loadBannerPrintings = createAsyncThunk(
	'bannerPicker/loadPrintings',
	async (args: { deckId: string; name: string }) => {
		const { name } = args;
		return fetchAPICardPrintings(name);
	}
);

export const saveBannerSelection = createAsyncThunk(
	'bannerPicker/save',
	async (
		args: { deckId: string; deckName: string; uuid: string },
		context
	) => {
		const { deckId, deckName, uuid } = args;
		const { dispatch } = context;
		await fetchAPIUpdateDeck(deckId, deckName, uuid);
		const deck = await dispatch(loadDeck(deckId)).unwrap();
		const config = deck.icon
			? configForNewArtwork(
					normalizeBannerBlendConfig(deck.bannerBlend?.config),
					deck.icon,
					isMobileDevice()
				)
			: undefined;
		await generateAndSaveBannerBlend(deckId, deck, config);
		await dispatch(loadDeck(deckId)).unwrap();
	}
);

export const bannerPickerSlice = createSlice({
	name: 'bannerPicker',
	initialState,
	reducers: {
		openBannerPicker: function (
			state,
			action: PayloadAction<{
				deckId: string;
				names: string[];
				deckCardUuids: string[];
				currentName: string;
				currentUuid: string | null;
			}>
		) {
			const { deckId, names, deckCardUuids, currentName, currentUuid } =
				action.payload;
			Object.assign(state, initialState, {
				open: true,
				deckId,
				names,
				deckCardUuids,
				query: currentName,
				chosenName: currentName,
				currentName,
				selectedUuid: currentUuid,
				currentUuid
			});
		},
		closeBannerPicker: function (state) {
			Object.assign(state, initialState);
		},
		setBannerQuery: function (state, action: PayloadAction<string>) {
			state.query = action.payload;
			state.suggestionsOpen = true;
		},
		setBannerSuggestionsOpen: function (
			state,
			action: PayloadAction<boolean>
		) {
			state.suggestionsOpen = action.payload;
		},
		chooseBannerCard: function (state, action: PayloadAction<string>) {
			if (!state.names.includes(action.payload)) return;
			if (state.chosenName !== action.payload)
				state.selectedUuid =
					action.payload === state.currentName
						? state.currentUuid
						: null;
			state.chosenName = action.payload;
			state.query = action.payload;
			state.printings = [];
			state.loading = true;
			state.error = null;
			state.suggestionsOpen = false;
			state.saveError = null;
		},
		selectBannerPrinting: function (state, action: PayloadAction<string>) {
			if (state.printings.some((item) => item.uuid === action.payload)) {
				state.selectedUuid = action.payload;
				state.saveError = null;
			}
		}
	},
	extraReducers: function (builder) {
		builder
			.addCase(loadBannerPrintings.pending, (state, action) => {
				if (
					state.deckId !== action.meta.arg.deckId ||
					state.chosenName !== action.meta.arg.name
				)
					return;
				state.requestId = action.meta.requestId;
				state.loading = true;
				state.error = null;
			})
			.addCase(loadBannerPrintings.fulfilled, (state, action) => {
				if (
					state.requestId !== action.meta.requestId ||
					state.deckId !== action.meta.arg.deckId ||
					state.chosenName !== action.meta.arg.name
				)
					return;
				state.printings = action.payload.filter((item) => !!item.art);
				state.loading = false;
				state.requestId = null;
				if (
					!state.printings.some(
						(item) => item.uuid === state.selectedUuid
					)
				) {
					state.selectedUuid =
						state.printings.find((item) =>
							state.deckCardUuids.includes(item.uuid)
						)?.uuid ??
						state.printings[0]?.uuid ??
						null;
				}
			})
			.addCase(loadBannerPrintings.rejected, (state, action) => {
				if (state.requestId !== action.meta.requestId) return;
				state.loading = false;
				state.requestId = null;
				state.error = 'Unable to load printings.';
			})
			.addCase(saveBannerSelection.pending, (state, action) => {
				if (state.deckId !== action.meta.arg.deckId) return;
				state.saving = true;
				state.saveError = null;
			})
			.addCase(saveBannerSelection.fulfilled, (state, action) => {
				if (state.deckId === action.meta.arg.deckId)
					Object.assign(state, initialState);
			})
			.addCase(saveBannerSelection.rejected, (state, action) => {
				if (state.deckId !== action.meta.arg.deckId) return;
				state.saving = false;
				state.saveError =
					action.error.message ??
					'Unable to save the banner card and blend. Please try again.';
			});
	}
});

export const {
	openBannerPicker,
	closeBannerPicker,
	setBannerQuery,
	setBannerSuggestionsOpen,
	chooseBannerCard,
	selectBannerPrinting
} = bannerPickerSlice.actions;

export function selectBannerPicker(state: { bannerPicker: BannerPickerState }) {
	return state.bannerPicker;
}
