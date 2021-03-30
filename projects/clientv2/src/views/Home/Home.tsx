import React, { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { fetchAPICreateDeck } from 'src/api/fetch-api-create-deck';
import { Button } from 'src/components/Button/Button';
import { SpotlightCard } from 'src/widgets/SpotlightCard/SpotlightCard';
import useSWR from 'swr';
import { fetchAPIDecks, FetchDecksResponse } from '../../api/fetch-api-decks';
import { Page } from '../../components/Page/Page';
import { Modal } from '../Deck/components/Modal';
import { NewDeckModal } from './components/NewDeck';

import styles from './home.module.css';

export type HomeProps = {
	initialData?: FetchDecksResponse;
};

export function Home(props: HomeProps) {
	const { initialData } = props;
	const router = useHistory();
	const [isShowModal, setIsShowModal] = useState(false);

	const { data, error } = useSWR('decks', async (key: string) => {
		return await fetchAPIDecks();
	});

	return (
		<Page
			header={
				<Button className={styles['header-button']} onClick={() => setIsShowModal(true)}>
					New Deck
				</Button>
			}
		>
			{isShowModal && (
				<Modal>
					<NewDeckModal
						onSubmit={async (name: string) => {
							const deckData = await fetchAPICreateDeck(name);

							router.push(`/deck/${deckData.deckId}`);
						}}
					/>
				</Modal>
			)}
			<div className={styles['home-container']}>
				{data?.map((deck) => {
					return (
						<Link to={`/deck/${deck.deckId}`}>
							<SpotlightCard name={deck.name} art={deck.art} />
						</Link>
					);
				})}
			</div>
		</Page>
	);
}
