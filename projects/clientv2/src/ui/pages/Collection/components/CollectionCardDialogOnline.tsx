import React from 'react';
import type { CollectionCardDialogProps } from './use-collection-card-draft';
import { useCollectionCardDraft } from './use-collection-card-draft';
import { CollectionCardError, CollectionCardTopBar, copiesText, NoLocationsHint, PrintingCounter, PrintingPlaces } from './CollectionCardDialogParts';

import styles from './collection-card-dialog.module.css';

/**
 * Edits how many copies of each printing of a card the collection holds, and which
 * storage location keeps them, with each printing's image. Copies not given a
 * location stay unplaced.
 */
export function CollectionCardDialogOnline(props: CollectionCardDialogProps) {
	const { cardName, printings, locations, onClose } = props;
	const editor = useCollectionCardDraft(props);

	return (
		<section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="collection-card-title">
			<CollectionCardTopBar cardName={cardName} editor={editor} onClose={onClose} />
			<div className={styles.body}>
				<CollectionCardError editor={editor} />
				{printings.map((card) => {
					const label = `${cardName} (${card.setCode})`;
					return (
						<section key={card.uuid} className={styles.printing} aria-label={label}>
							<div className={styles.printingHead}>
								<img src={card.images?.small ?? card.image} alt="" loading="lazy" />
								<div className={styles.printingText}>
									<strong>{card.setCode}</strong>
									<span>{copiesText(editor.draft[card.uuid].count)}</span>
								</div>
								<PrintingCounter uuid={card.uuid} label={label} editor={editor} />
							</div>
							<PrintingPlaces uuid={card.uuid} label={label} locations={locations} editor={editor} />
						</section>
					);
				})}
				<NoLocationsHint locations={locations} />
			</div>
		</section>
	);
}
