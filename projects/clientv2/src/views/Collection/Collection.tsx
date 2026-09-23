import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FetchCollectionsResponse } from 'src/api/fetch-api-collections';
import { fetchAPICreateCollection } from 'src/api/fetch-api-create-collection';
import { fetchAPICreateStorageLocation } from 'src/api/fetch-api-create-storage-location';
import { FetchStorageLocationsResponse } from 'src/api/fetch-api-storage-locations';
import { FetchDecksResponse } from '../../api/fetch-api-decks';
import { Page } from '../../components/Page/Page';
import { ControlledInput } from './components/ControlledInput';
import { scls } from 'src/utils/scls';

import styles from './Collection.module.css';
import { observeLocalQuery } from '../../torimtg/observe';

export type HomeProps = {
	initialData?: FetchDecksResponse;
};

export function Collection(props: HomeProps) {
	const { initialData } = props;

	const [collections, setCollections] = useState<FetchCollectionsResponse>(
		[]
	);
	const [locations, setStorageLocations] =
		useState<FetchStorageLocationsResponse>([]);

	const onCreateCollection = useCallback(
		(name: string) => {
			void fetchAPICreateCollection(name);
		},
		[]
	);
	const onCreateLocation = useCallback(
		(name: string) => {
			void fetchAPICreateStorageLocation(name);
		},
		[]
	);

	useEffect(() => {
		const stopCollections = observeLocalQuery<FetchCollectionsResponse>({ type: 'collections' }, setCollections);
		const stopLocations = observeLocalQuery<FetchStorageLocationsResponse>({ type: 'locations' }, setStorageLocations);
		return function () { stopCollections(); stopLocations(); };
	}, []);

	const listLen = useMemo(() => {
		const arr = new Array(Math.max(collections.length, locations.length));
		arr.fill(0);
		arr.forEach((_, ind) => {
			arr[ind] = ind;
		});

		return arr;
	}, [collections.length, locations.length]);

	console.log(listLen);

	return (
		<Page>
			<table className={scls(styles, 'list-table')}>
				<thead>
					<tr>
						<th>Collections</th>
						<th>Storage Locations</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<ControlledInput onSubmit={onCreateCollection} />
						</td>
						<td>
							<ControlledInput onSubmit={onCreateLocation} />
						</td>
					</tr>
					{listLen.map((i) => {
						const location = locations.at(i);
						const collection = collections.at(i);
						const key = `${location?.storage_location_id ?? '-'}-${
							collection?.collection_id ?? '-'
						}`;
						return (
							<tr key={key}>
								<td>
									{collection && (
										<Link
											to={`/collection/${collection.collection_id}`}
										>
											{collection.name}
										</Link>
									)}
								</td>
								<td>{location?.name ?? ''}</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</Page>
	);
}
