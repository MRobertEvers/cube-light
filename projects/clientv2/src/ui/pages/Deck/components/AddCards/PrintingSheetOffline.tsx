import React, { useEffect, useId, useState } from 'react';
import type { CardPrinting } from 'src/domain/models/card';
import { useAppDispatch } from 'src/redux/use-app-dispatch';
import { readLocalCardPrintings } from 'src/redux/cards/cards.thunks';
import { PrintingPickerOffline } from 'src/ui/kit/components/PrintingPicker/PrintingPickerOffline';
import { PrintingSheetFrame, usePrintingSheetSelection, type PrintingSheetProps } from './PrintingSheetFrame';
import styles from './printing-sheet.module.css';

/**
 * Picks a card list line's print version from the printings this device already has,
 * listed by set; choosing among printings it never downloaded needs the server.
 */
export function PrintingSheetOffline(props: PrintingSheetProps) {
	const { name, setCode, onPick, onClose } = props;
	const dispatch = useAppDispatch();
	const [printings, setPrintings] = useState<CardPrinting[]>([]);
	const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'failed'>(
		'loading'
	);
	const selection = usePrintingSheetSelection(printings, setCode);
	const titleId = useId();
	const radioName = useId();

	useEffect(() => {
		let active = true;
		dispatch(readLocalCardPrintings(name)).then(
			(items) => {
				if (!active) return;
				if (items === null) {
					setStatus('missing');
					return;
				}
				// The same printings the online sheet offers, so a pick means the same there.
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
		) : status === 'missing' ? (
			<p className={styles['message']} role="status">
				This device hasn't downloaded the print versions of {name}.
				Choosing one needs the server.
			</p>
		) : status === 'failed' ? (
			<p className={styles['message']} role="alert">
				Print versions could not be read on this device.
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
			<PrintingPickerOffline
				printings={printings}
				selectedUuid={selection.selectedUuid}
				onSelect={selection.pick}
				name={radioName}
				fill
				aria-labelledby={titleId}
			/>
		</PrintingSheetFrame>
	);
}
