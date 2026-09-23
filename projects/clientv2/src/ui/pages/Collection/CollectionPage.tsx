import React from 'react';
import { NextPage } from '../../kit/components/Page/NextPage';
import { Collection } from './Collection';

export function CollectionPage() {
	return (
		<NextPage title={'Collection'}>
			<Collection />
		</NextPage>
	);
}
