import React, { useState } from 'react';
import { FetchDecksResponse } from '../../api/fetch-api-decks';
import { Page } from '../../components/Page/Page';
import { LocationsDropdown } from './components/LocationsDropdown';
import { scls } from 'src/utils/scls';

import styles from './CollectionEdit.module.css';

export type HomeProps = {
	initialData?: FetchDecksResponse;
};

export function CollectionEdit(props: HomeProps) {
	const { initialData } = props;

	const [locationId, setLocationId] = useState<string | null>(null);

	return (
		<Page>
			<div className={scls(styles, 'page-contents')}>
				<div className={scls(styles, 'module')}>
					<div className={scls(styles, 'module-container')}>
						<div>
							<label>Location</label>
							<LocationsDropdown
								value={locationId}
								onChange={(e) => {
									setLocationId(e ? e.storage_location_id : null);
								}}
							/>
						</div>
					</div>
				</div>
			</div>
		</Page>
	);
}
