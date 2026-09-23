import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { loadBannerPrintings, saveBannerSelection } from './banner-picker.thunks';
import type { BannerPickerState, OpenBannerPickerPayload } from './banner-picker.types';

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

export const bannerPickerSlice = createSlice({
	name: 'bannerPicker',
	initialState,
	reducers: {
		openBannerPicker: function (
			state,
			action: PayloadAction<OpenBannerPickerPayload>
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
