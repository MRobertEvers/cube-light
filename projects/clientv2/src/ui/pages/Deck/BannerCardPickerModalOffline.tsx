import React, { useEffect, useState } from 'react';
import type { CardPrinting } from '../../../domain/models/card';
import { BannerCardPickerDialog } from './BannerCardPickerDialog';
import { PrintingPickerOffline } from '../../kit/components/PrintingPicker/PrintingPickerOffline';
import { useAppDispatch } from '../../../redux/use-app-dispatch';
import { useAppSelector } from '../../../redux/use-app-selector';
import { chooseBannerCard } from '../../../redux/banner-picker/bannerPickerSlice';
import { saveBannerSelection } from '../../../redux/banner-picker/banner-picker.thunks';
import { selectBannerPicker } from '../../../redux/banner-picker/banner-picker.selectors';
import { readLocalCardPrintings } from '../../../redux/cards/cards.thunks';
import { selectDeck } from '../../../redux/decks/decks.selectors';
import { printingsInDeck } from './components/ManagePrintings/use-manage-printings';
import type { BannerCardPickerModalProps } from './BannerCardPickerModalReduxWidget';
import styles from './deck-settings.module.css';

/** What this device has for the chosen card's printings. */
type LocalPrintings =
	| { status: 'loading' }
	| { status: 'missing' }
	| { status: 'failed' }
	| { status: 'ready'; printings: CardPrinting[] };

/**
 * Chooses the deck's banner card by name and set, from the printings this device already
 * has, or, when it never downloaded them, the printings the deck holds; the artwork itself
 * shows once the server can be reached.
 */
export function BannerCardPickerModalOffline(props: BannerCardPickerModalProps) {
	const { deckId, onClose, onSaved } = props;
	const dispatch = useAppDispatch();
	const picker = useAppSelector(selectBannerPicker);
	const deck = useAppSelector((root) => selectDeck(root, deckId));
	const [local, setLocal] = useState<LocalPrintings>({ status: 'loading' });
	// Kept here, not in the slice: the slice only accepts printings its online load fetched.
	const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
	const chosenName = picker.chosenName;

	useEffect(() => {
		if (!chosenName) return;
		let active = true;
		setLocal({ status: 'loading' });
		dispatch(readLocalCardPrintings(chosenName)).then(
			(items) => {
				if (!active) return;
				if (items === null) {
					setLocal({ status: 'missing' });
					setSelectedUuid(picker.deckCardUuids.find((uuid) => uuid === picker.selectedUuid) ?? null);
					return;
				}
				// The same printings the online picker offers: banners need artwork.
				const printings = items.filter((item) => !!item.art);
				setLocal({ status: 'ready', printings: printings });
				setSelectedUuid(defaultPrinting(printings, picker.selectedUuid, picker.deckCardUuids));
			},
			() => {
				if (active) setLocal({ status: 'failed' });
			}
		);
		return function () {
			active = false;
		};
	}, [chosenName, dispatch]);

	const editingName = picker.query !== chosenName;
	const showPrintings = !editingName && !!chosenName;
	// Never downloaded: the deck's own printings of the card still carry its art for later.
	const deckPrintings = deck && chosenName
		? printingsInDeck([], deck.cards.concat(deck.sideboard ?? []).filter((card) => card.name === chosenName && !!card.art))
		: [];
	const printings = !showPrintings
		? []
		: local.status === 'ready'
			? local.printings
			: local.status === 'missing'
				? deckPrintings
				: [];
	const selected = printings.find((item) => item.uuid === selectedUuid);
	const canSave =
		!!selected &&
		selected.uuid !== picker.currentUuid &&
		!picker.saving;

	const placeholder = !showPrintings ? (
		<p>Select a card above to choose its printing.</p>
	) : local.status === 'loading' ? (
		<p role="status">Loading printings…</p>
	) : local.status === 'missing' ? (
		<p role="status">
			This device hasn't downloaded the printings of {chosenName}, and this deck has none of them.
			Choosing a printing needs the server.
		</p>
	) : local.status === 'failed' ? (
		<p className={styles['error']} role="alert">
			Printings could not be read on this device.
		</p>
	) : (
		<p>No artwork is available for this card.</p>
	);
	async function save() {
		if (!selected || !canSave) return;
		try {
			await dispatch(
				saveBannerSelection({
					deckId,
					uuid: selected.uuid
				})
			).unwrap();
			onSaved();
		} catch {
			/* The Redux state keeps the error for retry; the selection stays here. */
		}
	}

	return (
		<BannerCardPickerDialog
			description="Offline: choose by set. The art shows once you're online."
			saveLabel="Save banner card"
			canSave={canSave}
			onSave={() => void save()}
			onChooseName={(name) => dispatch(chooseBannerCard(name))}
			onClose={onClose}
		>
			<div className={styles['printings-section']}>
				<h3>
					{showPrintings
						? `Printings of ${chosenName}`
						: 'Printings'}
				</h3>
				{showPrintings && local.status === 'missing' && deckPrintings.length > 0 && (
					<p className={styles['banner-modal-status']} role="status">
						Showing this deck&rsquo;s printings; other printings need the server.
					</p>
				)}
				<PrintingPickerOffline
					key={showPrintings ? chosenName : 'no-card'}
					printings={printings}
					selectedUuid={selectedUuid}
					onSelect={setSelectedUuid}
					name="banner-printing"
					disabled={picker.saving}
					placeholder={placeholder}
					aria-label="Choose printing"
				/>
			</div>
		</BannerCardPickerDialog>
	);
}

/** The printing already chosen, else one the deck holds, else the first. */
function defaultPrinting(printings: CardPrinting[], chosenUuid: string | null, deckCardUuids: string[]): string | null {
	if (printings.some((item) => item.uuid === chosenUuid)) return chosenUuid;
	return (
		printings.find((item) => deckCardUuids.includes(item.uuid))?.uuid ??
		printings[0]?.uuid ??
		null
	);
}
