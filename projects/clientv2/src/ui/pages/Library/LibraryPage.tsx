import React from 'react';
import { NextPage } from '../../kit/components/Page/NextPage';
import { Library } from './Library';

export function LibraryPage() {
	return (
		<NextPage title={'Library'}>
			<Library />
		</NextPage>
	);
}
