import React from 'react';
import { NextPage } from '../../components/Page/NextPage';
import { Collection } from './Collection';

export function CollectionPage() {
	return (
		<NextPage title={'Collection'}>
			<Collection />
		</NextPage>
	);
}
