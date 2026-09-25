import * as React from 'react';
import { BrowserRouter, Navigate, Route, Routes as RouterRoutes } from 'react-router-dom';
import { ParamMapper, PassParams } from 'src/ui/kit/components/PassParams/PassParams';
import { CollectionPage } from 'src/ui/pages/Collection';
import type { CollectionPageProps } from 'src/ui/pages/Collection/CollectionPage';
import { LibraryPage } from 'src/ui/pages/Library';
import { LocationPage } from 'src/ui/pages/Location';
import type { LocationPageProps } from 'src/ui/pages/Location/LocationPage';
import { DeckPageProps } from 'src/ui/pages/Deck/DeckPage';
import { TabletopPage } from 'src/ui/pages/Deck/TabletopPage';
import { DeckNotesPage, DeckStatsPage } from 'src/ui/pages/Deck/DeckTabPages';
import { DeckSettingsPage } from 'src/ui/pages/Deck/DeckSettingsPage';
import { DeckHistoryPage } from 'src/ui/pages/Deck/DeckHistoryPage';
import { DeckImageScanPage } from 'src/ui/pages/Deck/DeckImageScanPage';
import { DeckPage } from '../ui/pages/Deck';
import { HomePage } from '../ui/pages/Home';
import { QueuePage } from '../ui/pages/Queue/QueuePage';
import { ProfilePage } from '../ui/pages/Profile';

const CollectionMapper: ParamMapper<CollectionPageProps> = {
	collectionId: 'id'
};

const LocationMapper: ParamMapper<LocationPageProps> = {
	locationId: 'id'
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
				<Route path="/library" element={<LibraryPage />} />
				{/* The library's first address; kept so saved links still land. */}
				<Route path="/collection" element={<Navigate to="/library" replace />} />
				<Route path="/queue" element={<QueuePage />} />
				<Route path="/profile" element={<ProfilePage />} />
				<Route
					path="/collection/:id"
					element={
						<PassParams
							Component={CollectionPage}
							params={CollectionMapper}
						/>
					}
				/>
				<Route
					path="/location/:id"
					element={
						<PassParams
							Component={LocationPage}
							params={LocationMapper}
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
						<PassParams
							Component={TabletopPage}
							params={DeckMapper}
						/>
					}
				/>
				<Route
					path="/deck/:id/stats"
					element={
						<PassParams
							Component={DeckStatsPage}
							params={DeckMapper}
						/>
					}
				/>
				<Route
					path="/deck/:id/notes"
					element={
						<PassParams
							Component={DeckNotesPage}
							params={DeckMapper}
						/>
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
