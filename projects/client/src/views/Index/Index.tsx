import { useState, useMemo, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { NextPage } from 'next';
import useSWR, { mutate } from 'swr';
import { Page } from '../../components/Page/Page';

import styles from './index.module.css';
import { Spinner } from '../../components/Spinner/Spinner';
import AlertIcon from '../../components/Icons/AlertIcon';
import { useDeckWorker } from '../../workers/deck.hook';
import { DeckWorkerResponse } from '../../workers/deck.types';

export type WorkoutProps = {};

const Index: NextPage<WorkoutProps> = (props: WorkoutProps) => {
	const [suggestions, setSuggestions] = useState({ sorted: [], set: new Set() });
	const [isWaiting, setIsWaiting] = useState(false);
	const { data, error } = useSWR('1', async (key) => {
		const result = await fetch('http://localhost:4040/deck/1');
		const data = await result.json();

		return data as { name: string; cards: Array<{ name: string; count: string }> };
	});

	const postToWorker = useDeckWorker((e: DeckWorkerResponse) => {
		if (e.type === 'suggest') {
			setSuggestions(e);
		} else {
			setAddItemText('');
			setSuggestions({ sorted: [], set: new Set() });
			mutate('1');
		}

		setIsWaiting(false);
	});

	const [suggestDebounceTimer, setSuggestDebounceTimer] = useState(null);
	const [addItemText, setAddItemText] = useState('');

	let comboboxIndicator;
	if (isWaiting) {
		comboboxIndicator = <Spinner />;
	} else if (addItemText) {
		if (suggestions.set.size === 1 || suggestions.set.has(addItemText.toLowerCase())) {
			comboboxIndicator = (
				<button
					tabIndex={2}
					className={styles['submit-button']}
					onClick={() => {
						postToWorker({
							type: 'add',
							cardName: addItemText
						});
						setIsWaiting(true);
					}}
				>
					Submit
				</button>
			);
		} else {
			comboboxIndicator = <AlertIcon className={styles['combobox-input-alert']} />;
		}
	} else {
		comboboxIndicator = null;
	}
	return (
		<Page>
			<div className={styles['index-container-top']}>
				<div className={styles['combobox']}>
					<div className={styles['combobox-input']}>
						<div className={styles['combobox-submit']}>{comboboxIndicator}</div>
						<input
							onKeyDown={(e) => {
								if (e.which === 9 && suggestions.sorted.length === 1) {
									setAddItemText(suggestions.sorted[0]);
								}
							}}
							tabIndex={1}
							type="text"
							value={addItemText}
							placeholder="Card name"
							onChange={(e: ChangeEvent<HTMLInputElement>) => {
								const newText = e.target.value;
								setAddItemText(newText);
								if (suggestDebounceTimer) {
									clearTimeout(suggestDebounceTimer);
								}
								const timer = setTimeout(() => {
									if (newText.length > 3) {
										setIsWaiting(true);
										postToWorker({ type: 'suggest', payload: newText });
									} else {
										setSuggestions({ sorted: [], set: new Set() });
									}
								}, 500);
								setSuggestDebounceTimer(timer);
							}}
						/>
					</div>
					<ul className={styles['suggestions']}>
						{suggestions.sorted.map((suggestion) => (
							<li
								key={suggestion}
								onClick={() => {
									setAddItemText(suggestion);
								}}
							>
								{suggestion}
							</li>
						))}
					</ul>
				</div>
			</div>
			<div className={styles['index-container']}>
				<div>
					<div className={styles['avatar']}></div>
				</div>
				<div className={styles['body']}>
					<h2 className={styles['deck-title']}>{data?.name}</h2>

					<div className={styles['decklist-container']}>
						<table className={styles['decklist']}>
							<thead>
								<tr>
									<th>Card Name</th>
									<th>#</th>
								</tr>
							</thead>
							<tbody>
								{data?.cards.map((card, index) => {
									return (
										<tr key={index}>
											<td>{card.name}</td>
											<td>1</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</Page>
	);
};

export default Index;
