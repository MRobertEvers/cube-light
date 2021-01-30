import * as React from 'react';
import { BrowserRouter, Switch, Route, useParams } from 'react-router-dom';
import { DeckPage } from '../views/Deck';
import { HomePage } from '../views/Home';

function WrappedDeckPage() {
	const { id } = useParams() as any;

	return <DeckPage deckId={id} />;
}

export function Routes() {
	return (
		<BrowserRouter>
			<Switch>
				<Route path="/" exact>
					<HomePage />
				</Route>
				<Route path="/deck/:id" exact>
					<WrappedDeckPage />
				</Route>
			</Switch>
		</BrowserRouter>
	);
}
