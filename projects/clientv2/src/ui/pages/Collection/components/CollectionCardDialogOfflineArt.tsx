import React from 'react';
import { ManaCost } from 'src/ui/kit/components/ManaCost/ManaCost';
import { useOfflineCardArt } from 'src/ui/kit/hooks/useOfflineCardArt';
import type { CollectionCardDialogProps } from './use-collection-card-draft';
import { useCollectionCardDraft } from './use-collection-card-draft';
import { CollectionCardError, CollectionCardTopBar, copiesText, NoLocationsHint, PrintingCounter, PrintingPlaces } from './CollectionCardDialogParts';

import styles from './collection-card-dialog.module.css';

/**
 * The collection card dialog while the server is out of reach and the offline card art
 * is installed: the card's art from the art pack beside its mana cost and type, then each
 * printing by set and collector number with the same copy and placement counters. The
 * pack holds one image per card, so printings are told apart by set, as in the text form.
 */
export function CollectionCardDialogOfflineArt(props: CollectionCardDialogProps) {
	const { cardName, printings, locations, onClose } = props;
	const editor = useCollectionCardDraft(props);
	const card = printings[0];
	const art = useOfflineCardArt({ name: cardName, uuid: card ? card.uuid : '' });

	return (
		<section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="collection-card-title">
			<CollectionCardTopBar cardName={cardName} editor={editor} onClose={onClose} />
			<div className={styles.body}>
				<CollectionCardError editor={editor} />
				{card && (art !== null || card.manaCost || card.type) && (
					<div className={styles.cardArtLine}>
						{art !== null && <span className={styles.cardArt}>{art && <img src={art} alt="" />}</span>}
						<p className={styles.cardLine}>
							{card.manaCost && <ManaCost cost={card.manaCost} />}
							{card.type && <span>{card.type}</span>}
						</p>
					</div>
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
