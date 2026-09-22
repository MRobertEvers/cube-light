import React, { useEffect } from 'react';
import { LoadingIndicator } from 'src/components/LoadingIndicator';
import { useEventContext } from 'src/store/event-context';
import { CommandsCardDetailView } from './card-detail-view.commands';
import {
	initialCardDetailViewState,
	isCardDetailViewReady,
	reducerCardDetailView
} from './card-detail-view';

import styles from './card-detail-view.module.css';
import { useMinimumVisible } from 'src/hooks/useMinimumVisible';

interface CardDetailViewProps {
	cardUuid: string;

	onEvent: () => void;
}

export function CardDetailView(props: CardDetailViewProps) {
	const { cardUuid } = props;

	const { useReducer } = useEventContext();

	const [state, dispatch, key] = useReducer(
		'CardDetailView',
		reducerCardDetailView,
		initialCardDetailViewState
	);
	const ready =
		isCardDetailViewReady(state) && state.cardUuid === cardUuid;
	const showLoading = useMinimumVisible(!ready);

	useEffect(() => {
		dispatch(CommandsCardDetailView.initialize({ cardUuid }));
	}, [cardUuid, dispatch]);

	if (showLoading || !ready) {
		return <LoadingIndicator />;
	}

	const { cardDetails } = state;

	return (
		<div className={styles['card-detail-container']}>
			<img
				className={styles['card']}
				src={cardDetails.highResImage || undefined}
			></img>
			<h2>WOWOWOW</h2>
		</div>
	);
}
