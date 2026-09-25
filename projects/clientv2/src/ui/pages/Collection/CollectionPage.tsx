import React from 'react';
import { NextPage } from '../../kit/components/Page/NextPage';
import { Collection } from './Collection';

export type CollectionPageProps = {
	collectionId: string;
};

export function CollectionPage(props: CollectionPageProps) {
	const { collectionId } = props;
	return (
		<NextPage title={'Collection'}>
			<Collection collectionId={collectionId} />
		</NextPage>
	);
}
