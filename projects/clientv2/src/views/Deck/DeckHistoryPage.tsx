import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
	fetchAPIDeckHistory,
	DeckHistoryCard,
	DeckHistoryDetail,
	DeckHistoryResponse
} from '../../api/fetch-api-deck-history';
import { Page } from '../../components/Page/Page';
import { NextPage } from '../../components/Page/NextPage';
import styles from './deck-history.module.css';
import { useMinimumVisible } from '../../hooks/useMinimumVisible';

function CardChanges(props: { cards: DeckHistoryCard[]; direction: 'in' | 'out' }) {
	const { cards, direction } = props;
	return (
		<section className={styles.changeGroup}>
			<h3>{direction === 'in' ? 'Cards in' : 'Cards out'}</h3>
			{cards.length === 0 ? <p className={styles.none}>None</p> : (
			<ul>
				{cards.map((card) => (
					<li key={card.uuid}>
						<span className={styles.count}>{direction === 'in' ? '+' : '−'}{card.count}</span>
						<span>
							<strong>{card.name || 'Unknown card'}</strong>
							<code className={styles.uuid}>{card.uuid}</code>
						</span>
					</li>
				))}
			</ul>
			)}
		</section>
	);
}

const detailLabels: Record<DeckHistoryDetail['field'], string> = {
	name: 'Deck name',
	bannerCardUuid: 'Banner card UUID',
	art: 'Artwork',
	palette: 'Color palette',
	bannerCrop: 'Banner crop',
	topStyle: 'Deck top style',
	bannerBlend: 'Banner blend'
};

export function DeckHistoryPage(props: { deckId: string }) {
	const { deckId } = props;
	const [history, setHistory] = useState<DeckHistoryResponse | null>(null);
	const [error, setError] = useState(false);
	const showLoading = useMinimumVisible(!history && !error);

	useEffect(() => {
		let active = true;
		setHistory(null);
		setError(false);
		fetchAPIDeckHistory(deckId).then(
			(result) => { if (active) setHistory(result); },
			() => { if (active) setError(true); }
		);
		return () => { active = false; };
	}, [deckId]);

	return (
		<NextPage title="Deck edit history">
			<Page>
				<main className={styles.page}>
					<Link className={styles.back} to={`/deck/${deckId}`}>← Back to deck</Link>
					<h1>{history ? `${history.deckName} edit history` : 'Deck edit history'}</h1>
					{!showLoading && error ? <p role="alert">Unable to load deck edit history.</p> : showLoading || !history ? (
						<p>Loading history…</p>
					) : history.edits.length === 0 ? (
						<p>No card edits have been recorded for this deck yet.</p>
					) : (
						<ol className={styles.edits}>
							{history.edits.map((edit) => (
								<li className={styles.edit} key={edit.id}>
									<time dateTime={edit.createdAt}>
										{new Date(edit.createdAt).toLocaleString()}
									</time>
									{(edit.cardsIn.length > 0 || edit.cardsOut.length > 0) && (
										<div className={styles.changes}>
											<CardChanges cards={edit.cardsIn} direction="in" />
											<CardChanges cards={edit.cardsOut} direction="out" />
										</div>
									)}
									{edit.details.length > 0 && (
										<ul className={styles.details}>
											{edit.details.map((detail) => (
												<li key={detail.field}>
													<strong>{detailLabels[detail.field]}</strong>
													<code>{detail.before || 'None'} → {detail.after || 'None'}</code>
												</li>
											))}
										</ul>
									)}
								</li>
							))}
						</ol>
					)}
				</main>
			</Page>
		</NextPage>
	);
}
