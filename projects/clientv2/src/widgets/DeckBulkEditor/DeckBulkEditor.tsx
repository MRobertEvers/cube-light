import React, { useEffect, useState } from 'react';
import { fetchAPIDeck } from 'src/api/fetch-api-deck';
import { createNameLookupTree } from 'src/utils/lookup-tables/create-name-lookup-tree';
import { getFirstNMatchesInLookupTree } from 'src/utils/lookup-tables/iter-matches-in-lookup-tree';
import { TextInputButtonGroup } from './TextInputButtonGroup/TextInputButtonGroup';
import { iterDeckCardNames } from './utils';

export interface DeckBulkEditor {
	deckId: string;
}
export function DeckBulkEditor(props: DeckBulkEditor) {
	const { deckId } = props;

	const [deckSearch, setDeckSearch] = useState({});
	const [value, setValue] = useState('');
	const [showSuggestions, setShowSuggestions] = useState(false);

	useEffect(() => {
		fetchAPIDeck(deckId).then((deck) => {
			setDeckSearch(createNameLookupTree(iterDeckCardNames(deck)));
		});
	}, []);

	return (
		<div>
			<TextInputButtonGroup
				value={value}
				suggestions={
					value.length > 0 ? getFirstNMatchesInLookupTree(10, value, deckSearch) : []
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
