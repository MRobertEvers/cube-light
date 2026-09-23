import React, { useEffect, useState } from 'react';
import { BackLink } from '../../components/BackLink/BackLink';
import {
	DeckHistoryCard,
	DeckHistoryDetail,
	DeckHistoryResponse
} from '../../api/fetch-api-deck-history';
import { Page } from '../../components/Page/Page';
import { NextPage } from '../../components/Page/NextPage';
import styles from './deck-history.module.css';
import { observeLocalQuery } from '../../torimtg/observe';

function CardChanges(props: {
	cards: DeckHistoryCard[];
	direction: 'in' | 'out';
}) {
	const { cards, direction } = props;
	return (
		<section className={styles.changeGroup}>
			<h3>{direction === 'in' ? 'Cards in' : 'Cards out'}</h3>
			{cards.length === 0 ? (
				<p className={styles.none}>None</p>
			) : (
				<ul>
					{cards.map((card) => (
						<li key={`${card.board ?? 'main'}:${card.uuid}`}>
							<span className={styles.count}>
								{direction === 'in' ? '+' : '−'}
								{card.count}
							</span>
							<span>
								<strong>{card.name || 'Unknown card'}</strong>
								{card.board === 'side' && (
									<span className={styles.board}>
										{' '}
										· Sideboard
									</span>
								)}
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
	boardVisualization: 'Card view',
	bannerBlend: 'Banner blend',
	note: 'Note'
};

export function DeckHistoryPage(props: { deckId: string }) {
	const { deckId } = props;
	const [result, setResult] = useState<{
		deckId: string;
		history: DeckHistoryResponse | null;
		error: boolean;
	} | null>(null);
	const history = result?.deckId === deckId ? result.history : null;
	const error = result?.deckId === deckId && result.error;

	useEffect(() => {
		return observeLocalQuery<DeckHistoryResponse>(
			{ type: 'history', id: deckId },
			(history) => setResult({ deckId, history, error: false }),
			() => setResult({ deckId, history: null, error: true })
		);
	}, [deckId]);

	return (
		<NextPage title="Deck edit history">
			<Page>
				<main className={styles.page}>
					<BackLink to={`/deck/${deckId}`}>Back to deck</BackLink>
					<h1>
						{history
							? `${history.deckName} edit history`
							: 'Deck edit history'}
					</h1>
					{error ? (
						<p role="alert">Unable to load deck edit history.</p>
					) : !history ? (
						<p>Loading history…</p>
					) : history.edits.length === 0 ? (
						<p>
							No card edits have been recorded for this deck yet.
						</p>
					) : (
						<ol className={styles.edits}>
							{history.edits.map((edit) => (
								<li className={styles.edit} key={edit.id}>
									<time dateTime={edit.createdAt}>
										{new Date(
											edit.createdAt
										).toLocaleString()}
									</time>
									{(edit.cardsIn.length > 0 ||
										edit.cardsOut.length > 0) && (
										<div className={styles.changes}>
											<CardChanges
												cards={edit.cardsIn}
												direction="in"
											/>
											<CardChanges
												cards={edit.cardsOut}
												direction="out"
											/>
										</div>
									)}
									{edit.details.length > 0 && (
										<ul className={styles.details}>
											{edit.details.map((detail) => (
												<li key={detail.field}>
													<strong>
														{
															detailLabels[
																detail.field
															]
														}
													</strong>
													<code>
														{detail.before ||
															'None'}{' '}
														→{' '}
														{detail.after || 'None'}
													</code>
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
