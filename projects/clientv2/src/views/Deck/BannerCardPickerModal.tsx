import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Modal } from './components/Modal/Modal';
import { useAppDispatch } from '../../store/use-app-dispatch';
import {
	chooseBannerCard,
	closeBannerPicker,
	loadBannerPrintings,
	saveBannerSelection,
	selectBannerPicker,
	selectBannerPrinting,
	setBannerActiveIndex,
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
				<div className={styles['banner-modal-heading']}>
					<div>
						<h2 id="banner-modal-heading">Choose banner artwork</h2>
						<p>
							Search cards in this deck, then choose a printing.
						</p>
					</div>
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
				<div className={styles['banner-picker']}>
					<label htmlFor="banner-card-search">Card name</label>
					<input
						ref={inputRef}
						id="banner-card-search"
						type="search"
						role="combobox"
						aria-autocomplete="list"
						aria-expanded={
							picker.suggestionsOpen && matches.length > 0
						}
						aria-controls="banner-card-suggestions"
						aria-activedescendant={
							picker.suggestionsOpen && picker.activeIndex >= 0
								? `banner-card-option-${picker.activeIndex}`
								: undefined
						}
						value={picker.query}
						placeholder="Search cards in this deck"
						autoComplete="off"
						disabled={picker.saving}
						onFocus={() => dispatch(setBannerSuggestionsOpen(true))}
						onBlur={() => dispatch(setBannerSuggestionsOpen(false))}
						onChange={(event) =>
							dispatch(setBannerQuery(event.target.value))
						}
						onKeyDown={(event) => {
							if (
								event.key === 'Escape' &&
								picker.suggestionsOpen
							) {
								event.stopPropagation();
								dispatch(setBannerSuggestionsOpen(false));
								return;
							}
							if (
								(event.key === 'ArrowDown' ||
									event.key === 'ArrowUp') &&
								matches.length
							) {
								event.preventDefault();
								dispatch(setBannerSuggestionsOpen(true));
								dispatch(
									setBannerActiveIndex(
										event.key === 'ArrowDown'
											? (picker.activeIndex + 1) %
													matches.length
											: picker.activeIndex <= 0
												? matches.length - 1
												: picker.activeIndex - 1
									)
								);
							} else if (
								event.key === 'Enter' &&
								picker.suggestionsOpen &&
								matches.length
							) {
								event.preventDefault();
								chooseName(
									matches[
										picker.activeIndex >= 0
											? picker.activeIndex
											: 0
									]
								);
							}
						}}
					/>
					{picker.suggestionsOpen && matches.length > 0 && (
						<ul
							id="banner-card-suggestions"
							className={styles['banner-suggestions']}
							role="listbox"
							aria-label="Cards in deck"
						>
							{matches.map((name, index) => (
								<li
									key={name}
									id={`banner-card-option-${index}`}
									role="option"
									aria-selected={index === picker.activeIndex}
									className={
										index === picker.activeIndex
											? styles['active-suggestion']
											: undefined
									}
									onMouseDown={(event) =>
										event.preventDefault()
									}
									onClick={() => chooseName(name)}
								>
									{name}
								</li>
							))}
						</ul>
					)}
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
									<div
										className={styles['printing-list']}
										role="radiogroup"
										aria-label="Choose printing artwork"
									>
										{picker.printings.map((printing) => (
											<label
												key={printing.uuid}
												className={
													styles['printing-option']
												}
											>
												<input
													type="radio"
													name="banner-printing"
													value={printing.uuid}
													checked={
														printing.uuid ===
														picker.selectedUuid
													}
													disabled={picker.saving}
													onChange={() =>
														dispatch(
															selectBannerPrinting(
																printing.uuid
															)
														)
													}
												/>
												<img
													src={
														printing.art ??
														undefined
													}
													alt=""
													loading="lazy"
												/>
												<span>
													<strong>
														{printing.setCode}
													</strong>
													<small>
														{printing.uuid.slice(
															0,
															8
														)}
													</small>
												</span>
											</label>
										))}
									</div>
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
				<div className={styles['actions']}>
					<button
						type="button"
						className={styles['secondary']}
						onClick={() => dispatch(closeBannerPicker())}
						disabled={picker.saving}
					>
						Cancel
					</button>
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
			</div>
		</Modal>
	);
}
