import { useEffect, useState } from 'react';
import type { CardPrinting } from '../../../../../domain/models/card';
import { readCardPrintings, readLocalCardPrintings } from 'src/redux/cards/cards.thunks';
import { useAppDispatch } from 'src/redux/use-app-dispatch';

export type ServerPrintings = {
	printings: CardPrinting[];
	loading: boolean;
	loadError: string | null;
};

/** Every printing of `name`, asking the server when this device doesn't have them. */
export function useServerPrintings(name: string): ServerPrintings {
	const dispatch = useAppDispatch();
	const [printings, setPrintings] = useState<CardPrinting[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	useEffect(() => {
		let active = true;
		dispatch(readCardPrintings(name))
			.then(
				(items) => {
					if (active) setPrintings(items);
				},
				() => {
					if (active)
						setLoadError(
							'Other printings could not be loaded. You can still change the copies you have.'
						);
				}
			)
			.finally(() => {
				if (active) setLoading(false);
			});
		return function () {
			active = false;
		};
	}, [dispatch, name]);
	return { printings, loading, loadError };
}

export type LocalPrintings = {
	/** Null when this device never downloaded the card's printings. */
	printings: CardPrinting[] | null;
	loading: boolean;
};

/** The printings of `name` this device already has; never waits for the server. */
export function useLocalPrintings(name: string): LocalPrintings {
	const dispatch = useAppDispatch();
	const [printings, setPrintings] = useState<CardPrinting[] | null>(null);
	const [loading, setLoading] = useState(true);
	useEffect(() => {
		let active = true;
		dispatch(readLocalCardPrintings(name))
			.then(
				(items) => {
					if (active) setPrintings(items);
				},
				() => {
					// A failed local read is the same as nothing downloaded.
					if (active) setPrintings(null);
				}
			)
			.finally(() => {
				if (active) setLoading(false);
			});
		return function () {
			active = false;
		};
	}, [dispatch, name]);
	return { printings, loading };
}
