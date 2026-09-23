import * as React from 'react';
import { BrowserRouter, Route, Routes as RouterRoutes } from 'react-router-dom';
import { ParamMapper, PassParams } from 'src/components/PassParams/PassParams';
import { CollectionEditPage } from 'src/views/CollectionEdit';
import { CollectionEditPageProps } from 'src/views/CollectionEdit/CollectionEditPage';
import { DeckPageProps } from 'src/views/Deck/DeckPage';
import { TabletopPage } from 'src/views/Deck/TabletopPage';
import { DeckNotesPage, DeckStatsPage } from 'src/views/Deck/DeckTabPages';
import { DeckSettingsPage } from 'src/views/Deck/DeckSettingsPage';
import { DeckHistoryPage } from 'src/views/Deck/DeckHistoryPage';
import { DeckImageScanPage } from 'src/views/Deck/DeckImageScanPage';
import { CollectionPage } from '../views/Collection';
import { DeckPage } from '../views/Deck';
import { HomePage } from '../views/Home';
import { QueuePage } from '../views/Queue/QueuePage';
import { ProfilePage } from '../views/Profile';

const CollectionEditMapper: ParamMapper<CollectionEditPageProps> = {
	collectionId: 'id'
};

const DeckMapper: ParamMapper<DeckPageProps> = {
	deckId: 'id'
};

const DeckImageScanMapper: ParamMapper<
	React.ComponentProps<typeof DeckImageScanPage>
> = {
	deckId: 'id',
	taskId: 'taskId'
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
				<Route path="/queue" element={<QueuePage />} />
				<Route path="/profile" element={<ProfilePage />} />
				<Route
					path="/collection/:id"
					element={
						<PassParams
							Component={CollectionEditPage}
							params={CollectionEditMapper}
						/>
					}
				/>
				<Route
					path="/deck/:id"
					element={
						<PassParams Component={DeckPage} params={DeckMapper} />
					}
				/>
				<Route
					path="/deck/:id/tabletop"
					element={
						<PassParams Component={TabletopPage} params={DeckMapper} />
					}
				/>
				<Route
					path="/deck/:id/stats"
					element={
						<PassParams Component={DeckStatsPage} params={DeckMapper} />
					}
				/>
				<Route
					path="/deck/:id/notes"
					element={
						<PassParams Component={DeckNotesPage} params={DeckMapper} />
					}
				/>
				<Route
					path="/deck/:id/settings"
					element={
						<PassParams
							Component={DeckSettingsPage}
							params={DeckMapper}
						/>
					}
				/>
				<Route
					path="/deck/:id/history"
					element={
						<PassParams
							Component={DeckHistoryPage}
							params={DeckMapper}
						/>
					}
				/>
				<Route
					path="/deck/:id/scan/:taskId"
					element={
						<PassParams
							Component={DeckImageScanPage}
							params={DeckImageScanMapper}
						/>
					}
				/>
			</RouterRoutes>
		</BrowserRouter>
	);
}
