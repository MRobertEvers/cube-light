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
	const inputRef = useRef<HTMLInputElement>(null);
	const visible = picker.open && picker.deckId === deckId;

	useEffect(() => {
		if (!visible) return;
		const previousFocus = document.activeElement as HTMLElement | null;
		inputRef.current?.focus();
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
	const selected = picker.printings.find(
		(item) => item.uuid === picker.selectedUuid
	);
	const canSave =
		!editingName &&
		!!selected?.art &&
		picker.selectedUuid !== picker.currentUuid &&
		!picker.saving;

	const chooseName = (name: string) => {
		dispatch(chooseBannerCard(name));
		void dispatch(loadBannerPrintings({ deckId, name }));
	};
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
						inputRef={inputRef}
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
				{editingName ? (
					<p className={styles['banner-preview-hint']}>
						Choose a card name to view its printings.
					</p>
				) : (
					picker.chosenName && (
						<div className={styles['printings-section']}>
							<h3>Printings of {picker.chosenName}</h3>
							{picker.loading && (
								<p role="status">Loading printings…</p>
							)}
							{picker.error && (
								<p className={styles['error']} role="alert">
									{picker.error}{' '}
									<button
										type="button"
										onClick={() =>
											void dispatch(
												loadBannerPrintings({
													deckId,
													name: picker.chosenName
												})
											)
										}
									>
										Retry
									</button>
								</p>
							)}
							{!picker.loading &&
								!picker.error &&
								picker.printings.length === 0 && (
									<p>
										No artwork is available for this card.
									</p>
								)}
							{picker.printings.length > 0 && (
								<div className={styles['printing-layout']}>
									<PrintingPicker
										printings={picker.printings}
										selectedUuid={picker.selectedUuid}
										onSelect={(uuid) =>
											dispatch(selectBannerPrinting(uuid))
										}
										name="banner-printing"
										image="art"
										disabled={picker.saving}
										aria-label="Choose printing artwork"
									/>
									{selected?.art && (
										<div
											className={
												styles['printing-preview']
											}
										>
											<img
												src={selected.art}
												alt={`${picker.chosenName} ${selected.setCode} artwork preview`}
											/>
											<p>
												{picker.chosenName} ·{' '}
												{selected.setCode}
											</p>
										</div>
									)}
								</div>
							)}
						</div>
					)
				)}
			</div>
		</Modal>
	);
}
