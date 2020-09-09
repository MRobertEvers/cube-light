import styles from './decklist.module.css';

type DecklistProps = {
	name: string;
	cards: Array<{ name: string; count: string; image: string }>;
	onCardHover: (image: string) => void;
};

export function Decklist(props: DecklistProps) {
	const { name, cards, onCardHover } = props;

	return (
		<div className={styles['body']}>
			<h2 className={styles['deck-title']}>{name}</h2>

			<div className={styles['decklist-container']}>
				<table className={styles['decklist']}>
					<thead>
						<tr>
							<th></th>
							<th>Card Name</th>
						</tr>
					</thead>
					<tbody>
						{cards.map((card, index) => {
							return (
								<tr key={index}>
									<td>{card.count}</td>
									<td onMouseEnter={() => onCardHover(card.image)}>{card.name}</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
