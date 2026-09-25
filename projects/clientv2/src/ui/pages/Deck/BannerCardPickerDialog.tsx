import React, { ReactNode, useEffect, useRef } from 'react';
import { Modal } from './components/Modal/Modal';
import { SuggestionInput } from '../../kit/components/SuggestionInput/SuggestionInput';
import { useAppDispatch } from '../../../redux/use-app-dispatch';
import { useAppSelector } from '../../../redux/use-app-selector';
import { closeBannerPicker, setBannerQuery, setBannerSuggestionsOpen } from '../../../redux/banner-picker/bannerPickerSlice';
import { selectBannerPicker } from '../../../redux/banner-picker/banner-picker.selectors';
import styles from './deck-settings.module.css';

/**
 * The banner picker's dialog around its printings: focus trap, header with save and
 * close, save status, and the search over the deck's card names.
 */
export function BannerCardPickerDialog(props: {
	/** Under the heading: what the person does here. */
	description: string;
	saveLabel: string;
	canSave: boolean;
	onSave: () => void;
	onChooseName: (name: string) => void;
	onClose: () => void;
	children: ReactNode;
}) {
	const { canSave, onSave, onChooseName, onClose } = props;
	const dispatch = useAppDispatch();
	const picker = useAppSelector(selectBannerPicker);
	const dialogRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const previousFocus = document.activeElement as HTMLElement | null;
		// Focusing the input would open its suggestion list; land on the dialog instead.
		dialogRef.current?.focus();
		return function () {
			return previousFocus?.focus();
		};
	}, []);

	const matches = picker.names
		.filter((name) =>
			name.toLowerCase().includes(picker.query.trim().toLowerCase())
		)
		.slice(0, 10);
	function close() {
		dispatch(closeBannerPicker());
		onClose();
	}

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
						close();
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
							<p>{props.description}</p>
						</div>
						<div className={styles['actions']}>
							<button
								type="button"
								className={styles['primary']}
								onClick={onSave}
								disabled={!canSave}
							>
								{picker.saving
									? 'Generating and saving…'
									: props.saveLabel}
							</button>
							<button
								type="button"
								className={styles['modal-close']}
								onClick={close}
								disabled={picker.saving}
								aria-label="Close banner picker"
							>
								×
							</button>
						</div>
					</div>
				</header>
				{picker.saving && (
					<p className={styles['banner-modal-status']} role="status">
						Generating your banner layouts. This only runs when
						artwork or blend settings are saved.
					</p>
				)}
				{picker.saveError && (
					<p
						className={`${styles['banner-modal-status']} ${styles['error']}`}
						role="alert"
					>
						{picker.saveError}
					</p>
				)}
				<div className={styles['banner-picker']}>
					<label htmlFor="banner-card-search">Card</label>
					<SuggestionInput
						id="banner-card-search"
						value={picker.query}
						suggestions={matches}
						open={picker.suggestionsOpen}
						onOpenChange={(open) =>
							dispatch(setBannerSuggestionsOpen(open))
						}
						onChange={(query) => dispatch(setBannerQuery(query))}
						onSelect={onChooseName}
						enterSelects={matches[0]}
						placeholder="Search cards in this deck"
						disabled={picker.saving}
						listLabel="Cards in deck"
					/>
				</div>
				{props.children}
			</div>
		</Modal>
	);
}
