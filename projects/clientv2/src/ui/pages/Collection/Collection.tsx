import React, { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type {
	CollectionSummaries,
	StorageLocationSummaries
} from 'src/domain/models/library';
import { useAppDispatch } from 'src/redux/use-app-dispatch';
import { useSavedData } from 'src/ui/kit/hooks/useSavedData';
import { createCollection, createStorageLocation, readCollections, readStorageLocations } from 'src/redux/library/library.thunks';
import { DeckSummaries } from '../../../domain/models/deck';
import { Page } from '../../kit/components/Page/Page';
import { ControlledInput } from './components/ControlledInput';
import { scls } from 'src/ui/kit/utils/scls';

import styles from './Collection.module.css';

export type HomeProps = {
	initialData?: DeckSummaries;
};

const NO_COLLECTIONS: CollectionSummaries = [];
const NO_LOCATIONS: StorageLocationSummaries = [];

export function Collection(props: HomeProps) {
	const { initialData } = props;
	const dispatch = useAppDispatch();
	const collections = useSavedData('collections', readCollections).value ?? NO_COLLECTIONS;
	const locations = useSavedData('locations', readStorageLocations).value ?? NO_LOCATIONS;

	const onCreateCollection = useCallback(
		(name: string) => {
			void dispatch(createCollection(name));
		},
		[dispatch]
	);
	const onCreateLocation = useCallback(
		(name: string) => {
			void dispatch(createStorageLocation(name));
		},
		[dispatch]
	);

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
