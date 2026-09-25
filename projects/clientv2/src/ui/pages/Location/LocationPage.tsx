import React from 'react';
import { NextPage } from '../../kit/components/Page/NextPage';
import { Location } from './Location';

export type LocationPageProps = {
	locationId: string;
};

export function LocationPage(props: LocationPageProps) {
	const { locationId } = props;
	return (
		<NextPage title={'Storage location'}>
			<Location locationId={locationId} />
		</NextPage>
	);
}
