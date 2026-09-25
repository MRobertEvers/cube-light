import React from 'react';
import { ManaCost } from 'src/ui/kit/components/ManaCost/ManaCost';
import type { CollectionCardDialogProps } from './use-collection-card-draft';
import { useCollectionCardDraft } from './use-collection-card-draft';
import { CollectionCardError, CollectionCardTopBar, copiesText, NoLocationsHint, PrintingCounter, PrintingPlaces } from './CollectionCardDialogParts';

import styles from './collection-card-dialog.module.css';

/**
 * The collection card dialog as text, for when images can't load: the card's mana
 * cost and type, then each printing by set and collector number with the same
 * copy and placement counters. Saving needs nothing new from the server.
 */
export function CollectionCardDialogOffline(props: CollectionCardDialogProps) {
	const { cardName, printings, locations, onClose } = props;
	const editor = useCollectionCardDraft(props);
	const card = printings[0];

	return (
		<section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="collection-card-title">
			<CollectionCardTopBar cardName={cardName} editor={editor} onClose={onClose} />
			<div className={styles.body}>
				<CollectionCardError editor={editor} />
				{card && (card.manaCost || card.type) && (
					<p className={styles.cardLine}>
						{card.manaCost && <ManaCost cost={card.manaCost} />}
						{card.type && <span>{card.type}</span>}
					</p>
				)}
				{printings.map((printing) => {
					const label = `${cardName} (${printing.setCode})`;
					return (
						<section key={printing.uuid} className={styles.printing} aria-label={label}>
							<div className={styles.printingHead}>
								<div className={styles.printingText}>
									<strong>
										{printing.setCode}
										{printing.number && ` #${printing.number}`}
									</strong>
									<span>{copiesText(editor.draft[printing.uuid].count)}</span>
								</div>
								<PrintingCounter uuid={printing.uuid} label={label} editor={editor} />
							</div>
							<PrintingPlaces uuid={printing.uuid} label={label} locations={locations} editor={editor} />
						</section>
					);
				})}
				<NoLocationsHint locations={locations} />
			</div>
		</section>
	);
}
