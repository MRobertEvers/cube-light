import { useEffect, useState } from 'react';
import { loadCardArt } from '../../../redux/card-art/card-art.thunks';
import { useAppDispatch } from '../../../redux/use-app-dispatch';

/**
 * A card's art from the offline card art pack, by its printing then its name: an object
 * URL, null when the pack has none for it, undefined while it is being looked up.
 */
export function useOfflineCardArt(card: { name: string; uuid: string }): string | null | undefined {
	const dispatch = useAppDispatch();
	const { name, uuid } = card;
	const [found, setFound] = useState<{ uuid: string; url: string | null } | null>(null);
	useEffect(() => {
		let current = true;
		dispatch(loadCardArt({ name: name, uuid: uuid })).then(
			(url) => {
				if (current) setFound({ uuid: uuid, url: url });
			},
			() => {
				if (current) setFound({ uuid: uuid, url: null });
			}
		);
		return () => {
			current = false;
		};
	}, [dispatch, name, uuid]);
	return found?.uuid === uuid ? found.url : undefined;
}
