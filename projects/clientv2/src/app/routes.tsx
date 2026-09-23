import * as React from 'react';
import { BrowserRouter, Route, Routes as RouterRoutes } from 'react-router-dom';
import { ParamMapper, PassParams } from 'src/ui/kit/components/PassParams/PassParams';
import { CollectionEditPage } from 'src/ui/pages/CollectionEdit';
import { CollectionEditPageProps } from 'src/ui/pages/CollectionEdit/CollectionEditPage';
import { DeckPageProps } from 'src/ui/pages/Deck/DeckPage';
import { TabletopPage } from 'src/ui/pages/Deck/TabletopPage';
import { DeckNotesPage, DeckStatsPage } from 'src/ui/pages/Deck/DeckTabPages';
import { DeckSettingsPage } from 'src/ui/pages/Deck/DeckSettingsPage';
import { DeckHistoryPage } from 'src/ui/pages/Deck/DeckHistoryPage';
import { DeckImageScanPage } from 'src/ui/pages/Deck/DeckImageScanPage';
import { CollectionPage } from '../ui/pages/Collection';
import { DeckPage } from '../ui/pages/Deck';
import { HomePage } from '../ui/pages/Home';
import { QueuePage } from '../ui/pages/Queue/QueuePage';
import { ProfilePage } from '../ui/pages/Profile';

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
