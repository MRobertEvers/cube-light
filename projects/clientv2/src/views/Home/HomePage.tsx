import React from 'react';
import { NextPage } from '../../components/Page/NextPage';
import { Home } from './Home';

export function HomePage() {
	return (
		<NextPage title={'Home'}>
			<Home />
		</NextPage>
	);
}
