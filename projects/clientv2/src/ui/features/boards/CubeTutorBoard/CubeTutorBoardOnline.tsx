import React, { useState } from 'react';
import type { BoardProps } from '../board.types';
import { type CubeTutorPreview, CubeTutorColumns, previewPosition, previewWidth } from './CubeTutorColumns';
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
			{preview && !preview.card.backImages && (
				<img
					className={styles.preview}
					style={previewPosition(preview.row)}
					src={preview.card.images?.normal ?? preview.card.image}
					alt=""
					aria-hidden="true"
				/>
			)}
			{preview && preview.card.backImages && (
				// A double-faced card: both faces side by side.
				<span className={styles.previewFaces} style={previewPosition(preview.row, previewWidth(preview.card))} aria-hidden="true">
					<img className={styles.preview} src={preview.card.images?.normal ?? preview.card.image} alt="" />
					<img className={styles.preview} src={preview.card.backImages.normal} alt="" />
				</span>
			)}
		</div>
	);
}
