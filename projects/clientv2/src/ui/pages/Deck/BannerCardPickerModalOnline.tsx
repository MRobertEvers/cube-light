import React, { useEffect } from 'react';
import { BannerCardPickerDialog } from './BannerCardPickerDialog';
import { PrintingPickerOnline } from '../../kit/components/PrintingPicker/PrintingPickerOnline';
import { useAppDispatch } from '../../../redux/use-app-dispatch';
import { useAppSelector } from '../../../redux/use-app-selector';
import { chooseBannerCard, selectBannerPrinting } from '../../../redux/banner-picker/bannerPickerSlice';
import { loadBannerPrintings, saveBannerSelection } from '../../../redux/banner-picker/banner-picker.thunks';
import { selectBannerPicker } from '../../../redux/banner-picker/banner-picker.selectors';
import type { BannerCardPickerModalProps } from './BannerCardPickerModalReduxWidget';
import styles from './deck-settings.module.css';

/** Chooses the deck's banner card from each printing's art, as the server sends it. */
export function BannerCardPickerModalOnline(props: BannerCardPickerModalProps) {
	const { deckId, onClose, onSaved } = props;
	const dispatch = useAppDispatch();
	const picker = useAppSelector(selectBannerPicker);

	useEffect(() => {
		if (picker.chosenName)
			void dispatch(
				loadBannerPrintings({ deckId, name: picker.chosenName })
			);
	}, [deckId, dispatch]);

	const editingName = picker.query !== picker.chosenName;
	const showPrintings = !editingName && !!picker.chosenName;
	const selected = showPrintings
		? picker.printings.find((item) => item.uuid === picker.selectedUuid)
		: undefined;
	const canSave =
		!editingName &&
		!!selected?.art &&
		picker.selectedUuid !== picker.currentUuid &&
		!picker.saving;

	function chooseName(name: string) {
		dispatch(chooseBannerCard(name));
		void dispatch(loadBannerPrintings({ deckId, name }));
	}
	const placeholder = !showPrintings ? (
		<p>Select a card above to choose its printing.</p>
	) : picker.loading ? (
		<p role="status">Loading printings…</p>
	) : picker.error ? (
		<p className={styles['error']} role="alert">
			{picker.error}{' '}
			<button
				type="button"
				onClick={() =>
					void dispatch(
						loadBannerPrintings({ deckId, name: picker.chosenName })
					)
				}
			>
				Retry
			</button>
		</p>
	) : (
		<p>No artwork is available for this card.</p>
	);
	async function save() {
		if (!picker.selectedUuid || !canSave) return;
		try {
			await dispatch(
				saveBannerSelection({
					deckId,
					uuid: picker.selectedUuid
				})
			).unwrap();
			onSaved();
		} catch {
			/* The Redux state keeps the error and selection for retry. */
		}
	}

	return (
		<BannerCardPickerDialog
			description="Search cards in this deck, then choose a printing."
			saveLabel="Save banner art"
			canSave={canSave}
			onSave={() => void save()}
			onChooseName={chooseName}
			onClose={onClose}
		>
			<div className={styles['printings-section']}>
				<h3>
					{showPrintings
						? `Printings of ${picker.chosenName}`
						: 'Printings'}
				</h3>
				<div className={styles['printing-layout']}>
					<PrintingPickerOnline
						key={showPrintings ? picker.chosenName : 'no-card'}
						printings={showPrintings ? picker.printings : []}
						selectedUuid={picker.selectedUuid}
						onSelect={(uuid) =>
							dispatch(selectBannerPrinting(uuid))
						}
						name="banner-printing"
						image="art"
						disabled={picker.saving}
						placeholder={placeholder}
						aria-label="Choose printing artwork"
					/>
					<div className={styles['printing-preview']}>
						{selected?.art ? (
							<img
								src={selected.art}
								alt={`${picker.chosenName} ${selected.setCode} artwork preview`}
							/>
						) : (
							<div
								className={styles['printing-preview-empty']}
								aria-hidden="true"
							/>
						)}
						<p>
							{selected?.art
								? `${picker.chosenName} · ${selected.setCode}`
								: 'No printing selected'}
						</p>
					</div>
				</div>
			</div>
		</BannerCardPickerDialog>
	);
}
