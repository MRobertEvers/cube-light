import React, { useState } from 'react';
import type { BoardProps } from '../board.types';
import { type CubeTutorPreview, CubeTutorColumns, previewPosition } from './CubeTutorColumns';
import styles from './cube-tutor-board.module.css';

/**
 * A cube laid out like CubeTutor: a column per color, then multicolor,
 * colorless and lands. Colors split by card type, the rest by color
 * combination, and cards run by mana value. Hover a name to see the card.
 */
export function CubeTutorBoardOnline(props: BoardProps) {
	const [preview, setPreview] = useState<CubeTutorPreview | null>(null);
	return (
		<div className={styles.board}>
			<CubeTutorColumns
				cards={props.cards}
				busyGroup={props.busyGroup}
				onCardEvent={props.onCardEvent}
				annotations={props.annotations}
				onPreview={setPreview}
			/>
			{preview && (
				<img
					className={styles.preview}
					style={previewPosition(preview.row)}
					src={preview.card.images?.normal ?? preview.card.image}
					alt=""
					aria-hidden="true"
				/>
			)}
		</div>
	);
}
