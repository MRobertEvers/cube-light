import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Modal } from './components/Modal/Modal';
import { PrintingPicker } from '../../components/PrintingPicker/PrintingPicker';
import { SuggestionInput } from '../../components/SuggestionInput/SuggestionInput';
import { useAppDispatch } from '../../store/use-app-dispatch';
import {
	chooseBannerCard,
	closeBannerPicker,
	loadBannerPrintings,
	saveBannerSelection,
	selectBannerPicker,
	selectBannerPrinting,
	setBannerQuery,
	setBannerSuggestionsOpen
} from '../../store/banner-picker/banner-picker.state';
import styles from './deck-settings.module.css';

export function BannerCardPickerModal(props: {
	deckId: string;
	deckName: string;
	onSaved: () => void;
}) {
	const { deckId, deckName, onSaved } = props;
	const dispatch = useAppDispatch();
	const picker = useSelector(selectBannerPicker);
	const dialogRef = useRef<HTMLDivElement>(null);
	const visible = picker.open && picker.deckId === deckId;

	useEffect(() => {
		if (!visible) return;
		const previousFocus = document.activeElement as HTMLElement | null;
		// Focusing the input would open its suggestion list; land on the dialog instead.
		dialogRef.current?.focus();
		if (picker.chosenName)
			void dispatch(
				loadBannerPrintings({ deckId, name: picker.chosenName })
			);
		return () => previousFocus?.focus();
	}, [visible, deckId, dispatch]);

	if (!visible) return null;
	const matches = picker.names
		.filter((name) =>
			name.toLowerCase().includes(picker.query.trim().toLowerCase())
		)
		.slice(0, 10);
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

	const chooseName = (name: string) => {
		dispatch(chooseBannerCard(name));
		void dispatch(loadBannerPrintings({ deckId, name }));
	};
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
	const save = async () => {
		if (!picker.selectedUuid || !canSave) return;
		try {
			await dispatch(
				saveBannerSelection({
					deckId,
					deckName,
					uuid: picker.selectedUuid
				})
			).unwrap();
			onSaved();
		} catch {
			/* The Redux state keeps the error and selection for retry. */
		}
	};

	return (
		<Modal wide>
			<div
				ref={dialogRef}
				className={styles['banner-modal']}
				role="dialog"
				tabIndex={-1}
				aria-modal="true"
				aria-labelledby="banner-modal-heading"
				onKeyDown={(event) => {
					if (event.key === 'Escape' && !picker.saving) {
						event.preventDefault();
						dispatch(closeBannerPicker());
					}
					if (event.key !== 'Tab') return;
					const focusable = Array.from(
						dialogRef.current?.querySelectorAll<HTMLElement>(
							'input:not(:disabled), button:not(:disabled)'
						) ?? []
					);
					if (
						event.shiftKey &&
						document.activeElement === focusable[0]
					) {
						event.preventDefault();
						focusable[focusable.length - 1]?.focus();
					} else if (
						!event.shiftKey &&
						document.activeElement ===
							focusable[focusable.length - 1]
					) {
						event.preventDefault();
						focusable[0]?.focus();
					}
				}}
			>
				<header className={styles['banner-modal-heading']}>
					<div className={styles['banner-modal-heading-row']}>
						<div>
							<h2 id="banner-modal-heading">
								Choose banner artwork
							</h2>
							<p>
								Search cards in this deck, then choose a
								printing.
							</p>
						</div>
						<div className={styles['actions']}>
							<button
								type="button"
								className={styles['primary']}
								onClick={() => void save()}
								disabled={!canSave}
							>
								{picker.saving
									? 'Generating and saving…'
									: 'Save banner art'}
							</button>
							<button
								type="button"
								className={styles['modal-close']}
								onClick={() => dispatch(closeBannerPicker())}
								disabled={picker.saving}
								aria-label="Close banner picker"
							>
								×
							</button>
						</div>
					</div>
					{picker.saving && (
						<p role="status">
							Generating your banner layouts. This only runs when
							artwork or blend settings are saved.
						</p>
					)}
					{picker.saveError && (
						<p className={styles['error']} role="alert">
							{picker.saveError}
						</p>
					)}
				</header>
				<div className={styles['banner-picker']}>
					<label htmlFor="banner-card-search">Card name</label>
					<SuggestionInput
						id="banner-card-search"
						value={picker.query}
						suggestions={matches}
						open={picker.suggestionsOpen}
						onOpenChange={(open) =>
							dispatch(setBannerSuggestionsOpen(open))
						}
						onChange={(query) => dispatch(setBannerQuery(query))}
						onSelect={chooseName}
						enterSelects={matches[0]}
						placeholder="Search cards in this deck"
						disabled={picker.saving}
						listLabel="Cards in deck"
					/>
				</div>
				<div className={styles['printings-section']}>
					<h3>
						{showPrintings
							? `Printings of ${picker.chosenName}`
							: 'Printings'}
					</h3>
					<div className={styles['printing-layout']}>
						<PrintingPicker
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
			</div>
		</Modal>
	);
}
