import React from 'react';
import type { PackCard, PackCardFace } from '../../../domain/models/card-pack';
import { ManaCost, ManaText } from '../../kit/components/ManaCost/ManaCost';
import styles from './profile.module.css';

function faceStats(face: PackCardFace): string | null {
	if (face.power !== null && face.toughness !== null) return `${face.power} / ${face.toughness}`;
	return face.loyalty ?? face.defense;
}

/** A card from the offline card data: each face's name, cost, type line, rules text and stats. */
export function PackCardText(props: { card: PackCard }) {
	const { card } = props;
	return (
		<div className={styles.packCard}>
			{card.faces.map(function (face, index) {
				const stats = faceStats(face);
				return (
					<div key={index} className={styles.packFace}>
						<p className={styles.packName}>
							<strong>{face.name ?? card.name}</strong>
							{face.manaCost && <ManaCost cost={face.manaCost} />}
						</p>
						{face.type && <p className={styles.packType}>{face.type}</p>}
						{face.text?.split('\n').map(function (line, lineIndex) {
							return (
								<p key={lineIndex}>
									<ManaText text={line} />
								</p>
							);
						})}
						{stats && <p className={styles.packStats}>{stats}</p>}
					</div>
				);
			})}
		</div>
	);
}
