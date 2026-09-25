import React from 'react';
import { selectConnectivity } from 'src/redux/connectivity/connectivity.selectors';
import { useAppSelector } from 'src/redux/use-app-selector';
import type { CollectionCardDialogProps } from './use-collection-card-draft';
import { CollectionCardDialogOffline } from './CollectionCardDialogOffline';
import { CollectionCardDialogOnline } from './CollectionCardDialogOnline';

/** The collection card dialog for this connection: printing images need the server, the counts do not. */
export function CollectionCardDialogReduxWidget(props: CollectionCardDialogProps) {
	const connectivity = useAppSelector(selectConnectivity);
	return connectivity === 'online' ? (
		<CollectionCardDialogOnline
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
