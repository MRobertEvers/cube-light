import * as React from 'react';
import { BrowserRouter, Route, Routes as RouterRoutes } from 'react-router-dom';
import { ParamMapper, PassParams } from 'src/components/PassParams/PassParams';
import { CollectionEditPage } from 'src/views/CollectionEdit';
import { CollectionEditPageProps } from 'src/views/CollectionEdit/CollectionEditPage';
import { DeckPageProps } from 'src/views/Deck/DeckPage';
import { DeckSettingsPage } from 'src/views/Deck/DeckSettingsPage';
import { DeckHistoryPage } from 'src/views/Deck/DeckHistoryPage';
import { CollectionPage } from '../views/Collection';
import { DeckPage } from '../views/Deck';
import { HomePage } from '../views/Home';

const CollectionEditMapper: ParamMapper<CollectionEditPageProps> = {
	collectionId: 'id'
};

const DeckMapper: ParamMapper<DeckPageProps> = {
	deckId: 'id'
};

/**
 * NextJS would normally do this for us.
 * @returns
 */
export function Routes() {
	return (
		<BrowserRouter>
			<RouterRoutes>
				<Route path="/" element={<HomePage />} />
				<Route path="/collection" element={<CollectionPage />} />
				<Route
					path="/collection/:id"
					element={<PassParams Component={CollectionEditPage} params={CollectionEditMapper} />}
				/>
				<Route path="/deck/:id" element={<PassParams Component={DeckPage} params={DeckMapper} />} />
				<Route path="/deck/:id/settings" element={<PassParams Component={DeckSettingsPage} params={DeckMapper} />} />
				<Route path="/deck/:id/history" element={<PassParams Component={DeckHistoryPage} params={DeckMapper} />} />
			</RouterRoutes>
		</BrowserRouter>
	);
}
