import React, { useState } from 'react';
import { CardHoverPreviewOfflineArt } from '../../CardPreviewer/CardHoverPreviewOfflineArt';
import type { BoardProps } from '../board.types';
import { type CubeTutorPreview, CubeTutorColumns, previewPosition } from './CubeTutorColumns';
import styles from './cube-tutor-board.module.css';

/**
 * The CubeTutor board while the server is out of reach and the offline card
 * art is installed: the same color columns, but hovering a name shows the
 * card's art and text, since its image may never have been fetched.
 */
export function CubeTutorBoardOfflineArt(props: BoardProps) {
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
				<div
					className={styles['preview-text']}
					style={previewPosition(preview.row)}
					aria-hidden="true"
				>
					<CardHoverPreviewOfflineArt card={preview.card} />
				</div>
			)}
		</div>
	);
}
