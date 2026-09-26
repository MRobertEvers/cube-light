import React from 'react';
import { selectOfflineCardArt } from 'src/redux/card-art/card-art.selectors';
import { selectConnectivity } from 'src/redux/connectivity/connectivity.selectors';
import { useAppSelector } from 'src/redux/use-app-selector';
import type { CollectionCardDialogProps } from './use-collection-card-draft';
import { CollectionCardDialogOffline } from './CollectionCardDialogOffline';
import { CollectionCardDialogOfflineArt } from './CollectionCardDialogOfflineArt';
import { CollectionCardDialogOnline } from './CollectionCardDialogOnline';

/**
 * The collection card dialog for this connection: printing images need the server; offline,
 * the card's art comes from the offline art pack when it is installed; the counts need neither.
 */
export function CollectionCardDialogReduxWidget(props: CollectionCardDialogProps) {
	const connectivity = useAppSelector(selectConnectivity);
	const offlineArt = useAppSelector(selectOfflineCardArt);
	if (connectivity === 'online') {
		return (
			<CollectionCardDialogOnline
				collectionId={props.collectionId}
				cardName={props.cardName}
				printings={props.printings}
				stored={props.stored}
				locations={props.locations}
				onClose={props.onClose}
			/>
		);
	}
	return offlineArt ? (
		<CollectionCardDialogOfflineArt
			collectionId={props.collectionId}
			cardName={props.cardName}
			printings={props.printings}
			stored={props.stored}
			locations={props.locations}
			onClose={props.onClose}
		/>
	) : (
		<CollectionCardDialogOffline
			collectionId={props.collectionId}
			cardName={props.cardName}
			printings={props.printings}
			stored={props.stored}
			locations={props.locations}
			onClose={props.onClose}
		/>
	);
}
