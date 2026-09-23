import React from 'react';
import { NextPage } from '../../kit/components/Page/NextPage';
import { CollectionEdit } from './CollectionEdit';
import { scls } from 'src/ui/kit/utils/scls';

export interface CollectionEditPageProps {
	collectionId: string;
}

export function CollectionEditPage(props: CollectionEditPageProps) {
	const { collectionId } = props;
	return (
		<NextPage title={'Collection'}>
			<CollectionEdit />
		</NextPage>
	);
}
