import { useState, useMemo, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { NextPage } from 'next';
import { Page } from '../../components/Page/Page';

import styles from './index.module.css';

export type WorkoutProps = {};

const tmp = [];
for (let i = 0; i < 100; i += 1) {
	tmp.push('Words');
}

const Index: NextPage<WorkoutProps> = (props: WorkoutProps) => {
	const [suggestions, setSuggestions] = useState([]);
	const worker = useMemo(() => {
		if (typeof Worker !== 'undefined') return new Worker('../workers/suggestions.worker.ts');
	}, []);
	useEffect(() => {
		if (!worker) {
			return;
		}
		worker.onmessage = (e: MessageEvent) => {
			setSuggestions(e.data);
		};

		return () => {
			worker.terminate();
		};
	}, [worker]);
	return (
		<Page>
			<div className={styles['index-container']}>
				<div>
					<div className={styles['avatar']}></div>
				</div>
				<div className={styles['body']}>
					<h2 className={styles['deck-title']}>Mono Blue</h2>
					<input
						type="text"
						onChange={(e: ChangeEvent<HTMLInputElement>) => {
							const newText = e.target.value;
							worker.postMessage(newText);
						}}
					/>
					<button>Add Card</button>
					{suggestions.length && (
						<ul>
							{suggestions.map((suggestion) => (
								<li>{suggestion}</li>
							))}
						</ul>
					)}
					<table className={styles['decklist']}>
						<tr>
							<th>Card Name</th>
							<th>#</th>
						</tr>
						<tr>
							<td>Shark Typhoon</td>
							<td>1</td>
						</tr>
					</table>
				</div>
			</div>
		</Page>
	);
};

export default Index;
