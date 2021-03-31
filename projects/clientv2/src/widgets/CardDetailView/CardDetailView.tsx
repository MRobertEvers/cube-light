import React from 'react';
import useSWR from 'swr';
import { LoadingIndicator } from 'src/components/LoadingIndicator';
import { fetchAPICardDetails } from 'src/api/fetch-api-card-details';

interface CardDetailViewProps {
	cardUuid: string;
}

export function CardDetailView(props: CardDetailViewProps) {
	const { cardUuid } = props;

	const { data } = useSWR(cardUuid, async () => {
		return fetchAPICardDetails(cardUuid);
	});

	if (!data) {
		<LoadingIndicator />;
	}

	return (
		<div>
			<img src={data?.image}></img>
			<h2>WOWOWOW</h2>
		</div>
	);
}
