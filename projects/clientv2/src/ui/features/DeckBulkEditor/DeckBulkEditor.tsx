import React, { useEffect, useState } from 'react';
import { useAppDispatch } from 'src/redux/use-app-dispatch';
import { readDeck } from 'src/redux/decks/decks.thunks';
import { createNameLookupTree } from 'src/domain/card-names/lookup-tables/create-name-lookup-tree';
import { getFirstNMatchesInLookupTree } from 'src/domain/card-names/lookup-tables/iter-matches-in-lookup-tree';
import { TextInputButtonGroup } from './TextInputButtonGroup/TextInputButtonGroup';
import { iterDeckCardNames } from './utils';

export interface DeckBulkEditor {
	deckId: string;
}
export function DeckBulkEditor(props: DeckBulkEditor) {
	const { deckId } = props;
	const dispatch = useAppDispatch();

	const [loadedSearch, setLoadedSearch] = useState<{
		deckId: string;
		search: object;
	} | null>(null);
	const deckSearch =
		loadedSearch?.deckId === deckId ? loadedSearch.search : {};
	const [value, setValue] = useState('');
	const [showSuggestions, setShowSuggestions] = useState(false);

	useEffect(() => {
		let active = true;
		void dispatch(readDeck(deckId)).then((deck) => {
			if (active)
				setLoadedSearch({
					deckId,
					search: createNameLookupTree(iterDeckCardNames(deck))
				});
		});
		return function () {
			active = false;
		};
	}, [dispatch, deckId]);

	return (
		<div>
			<TextInputButtonGroup
				value={value}
				suggestions={
					value.length > 0
						? getFirstNMatchesInLookupTree(10, value, deckSearch)
						: []
				}
				showSuggestions={showSuggestions}
				buttonText="name"
				onEvent={(e) => {
					switch (e.type) {
						case 'changed':
							setValue(e.payload);
							setShowSuggestions(true);
							break;
						case 'selected':
							setValue(e.payload);
							setShowSuggestions(false);
							break;
					}
				}}
			/>
		</div>
	);
}
