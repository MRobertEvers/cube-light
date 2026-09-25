import React, { useEffect, useId, useState } from 'react';
import type { CardPrinting } from 'src/domain/models/card';
import { useAppDispatch } from 'src/redux/use-app-dispatch';
import { readCardPrintings } from 'src/redux/cards/cards.thunks';
import { PrintingPickerOnline } from 'src/ui/kit/components/PrintingPicker/PrintingPickerOnline';
import { PrintingSheetFrame, usePrintingSheetSelection, type PrintingSheetProps } from './PrintingSheetFrame';
import styles from './printing-sheet.module.css';

/** Picks a card list line's print version from the card art the server sends. */
export function PrintingSheetOnline(props: PrintingSheetProps) {
	const { name, setCode, onPick, onClose } = props;
	const dispatch = useAppDispatch();
	const [printings, setPrintings] = useState<CardPrinting[]>([]);
	const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>(
		'loading'
	);
	const selection = usePrintingSheetSelection(printings, setCode);
	const titleId = useId();
	const radioName = useId();

	useEffect(() => {
		let active = true;
		dispatch(readCardPrintings(name)).then(
			(items) => {
				if (!active) return;
				setPrintings(items.filter((item) => !!item.image));
				setStatus('ready');
			},
			() => {
				if (active) setStatus('failed');
			}
		);
		return function () {
			active = false;
		};
	}, [dispatch, name]);

	const message =
		status === 'loading' ? (
			<p className={styles['message']} role="status">
				Loading print versions…
			</p>
		) : status === 'failed' ? (
			<p className={styles['message']} role="alert">
				Print versions could not be loaded.
			</p>
		) : printings.length === 0 ? (
			<p className={styles['message']}>
				No print versions found for {name}.
			</p>
		) : null;

	return (
		<PrintingSheetFrame
			name={name}
			titleId={titleId}
			selected={selection.selected}
			changed={selection.changed}
			message={message}
			anyHidden={!selection.selectedUuid}
			onAny={() => selection.pick(null)}
			onPick={onPick}
			onClose={onClose}
		>
			<PrintingPickerOnline
				printings={printings}
				selectedUuid={selection.selectedUuid}
				onSelect={selection.pick}
				name={radioName}
				image="card"
				fill
				aria-labelledby={titleId}
			/>
		</PrintingSheetFrame>
	);
}
