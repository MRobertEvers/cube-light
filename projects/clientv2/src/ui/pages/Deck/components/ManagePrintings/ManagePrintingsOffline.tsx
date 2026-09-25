import React, { useMemo } from 'react';
import { DECK_BOARD_ORDER } from '../../../../../domain/deck/boards';
import { BoardChips } from 'src/ui/kit/components/OwnershipBadge/OwnershipBadge';
import { ManaCost } from 'src/ui/kit/components/ManaCost/ManaCost';
import type { ManagePrintingsProps, PrintingInfo } from './manage-printings.types';
import { useLocalPrintings } from './use-card-printings';
import {
	printingsInDeck,
	setNameOf,
	totalOf,
	useManagePrintings
} from './use-manage-printings';
import {
	AllPrintingsFooter,
	AllPrintingsHeader,
	ChoiceRemoveButton,
	DeckPaneActions,
	DeckPrintingText,
	DeckRowControls,
	ManagePrintingsHeader,
	noChoicesMessage
} from './ManagePrintingsParts';

import styles from './manage-printings.module.css';

/** The set and, when known, the collector number that tell printings apart without images. */
function printingLine(printing: PrintingInfo) {
	return printing.number
		? `${setNameOf(printing)} · #${printing.number}`
		: setNameOf(printing);
}

/**
 * The card editor as text, for when the server can't be reached: the same steppers,
 * moves and printing changes, with printings listed by set instead of shown as
 * images. Other printings come only from what this device downloaded; without
 * them it offers the deck's own printings and says the rest need the server.
 */
export function ManagePrintingsOffline(props: ManagePrintingsProps) {
	const { target, cards } = props;
	const local = useLocalPrintings(target.name);
	const printings = useMemo(
		() => local.printings ?? printingsInDeck(target.printings, cards),
		[local.printings, target.printings, cards]
	);
	const manager = useManagePrintings(props, printings);
	const { rows, view, saving, saveError, replacingUuid, replacing, choices } = manager;
	const card = target.printings[0] ?? cards[0];

	return (
		<section
			className={`${styles['container']} ${styles[`show-${view}`]}`}
			role="dialog"
			aria-modal="true"
			aria-labelledby="manage-printings-title"
			aria-busy={saving}
		>
			<ManagePrintingsHeader manager={manager} />
			{saveError && (
				<p className={styles['save-error']} role="alert">
					{saveError}
				</p>
			)}
			<div className={styles['body']}>
				<section
					className={`${styles['pane']} ${styles['deck-pane']}`}
					aria-labelledby="manage-printings-deck"
				>
					<h3 id="manage-printings-deck" className={styles['pane-label']}>
						In this deck
					</h3>
					{card && (card.manaCost || card.type) && (
						<p className={styles['card-line']}>
							{card.manaCost && <ManaCost cost={card.manaCost} />}
							{card.type && <span>{card.type}</span>}
						</p>
					)}
					<ul className={styles['deck-rows']}>
						{rows.map((uuid) => (
							<li
								key={uuid}
								className={`${styles['deck-row']} ${styles['deck-row-text-only']} ${
									replacingUuid === uuid ? styles['replacing'] : ''
								}`}
							>
								<DeckPrintingText
									manager={manager}
									uuid={uuid}
									setLine={printingLine(manager.rowPrinting(uuid))}
								/>
								<DeckRowControls
									manager={manager}
									uuid={uuid}
									changeDisabled={local.loading}
								/>
							</li>
						))}
					</ul>
					<DeckPaneActions
						manager={manager}
						addHint={
							local.printings
								? 'Sets downloaded to this device'
								: 'Printings already in this deck'
						}
					/>
				</section>
				<section
					className={`${styles['pane']} ${styles['all-pane']}`}
					aria-labelledby="manage-printings-all"
				>
					<AllPrintingsHeader manager={manager} />
					<div className={styles['grid-scroll']}>
						{local.loading && (
							<p className={styles['message']} role="status">
								Looking for printings on this device…
							</p>
						)}
						{!local.loading && !local.printings && (
							<p className={styles['message']} role="status">
								This device hasn’t downloaded the other printings of{' '}
								{target.name}. Adding a new printing needs the server;
								until it’s back you can choose between the printings
								already in this deck.
							</p>
						)}
						{!local.loading && choices.length === 0 && (
							<p className={styles['message']}>{noChoicesMessage(manager)}</p>
						)}
						<ul className={styles['choice-list']}>
							{choices.map((printing) => {
								const choice = manager.choiceOf(printing.uuid);
								const owned = manager.ownedOf(printing.uuid);
								return (
									<li
										key={choice.uuid}
										className={
											totalOf(choice.counts) > 0
												? styles['in-deck']
												: undefined
										}
									>
										<button
											type="button"
											className={styles['choice']}
											title={choice.label}
											aria-label={choice.actionLabel}
											disabled={choice.disabled}
											onClick={() => manager.choose(choice.uuid)}
										>
											<span className={styles['choice-text']}>
												<span className={styles['tile-code']}>
													{choice.printing.setCode}
													{choice.printing.number &&
														` #${choice.printing.number}`}
												</span>
												<span className={styles['tile-name']}>
													{choice.printing.setName ?? ' '}
												</span>
											</span>
											{owned > 0 && (
												<BoardChips
													chips={[{ label: `own ${owned}`, tone: 'owned' }]}
												/>
											)}
											{totalOf(choice.counts) > 0 && (
												<span
													className={styles['choice-badges']}
													aria-hidden="true"
												>
													{DECK_BOARD_ORDER.filter(
														(board) => choice.counts[board] > 0
													).map((board) => (
														<span
															key={board}
															className={styles['badge']}
															data-board={board}
														>
															{board === 'side'
																? `SB ×${choice.counts[board]}`
																: `×${choice.counts[board]}`}
														</span>
													))}
												</span>
											)}
										</button>
										{choice.count > 0 && !replacing && (
											<ChoiceRemoveButton
												manager={manager}
												uuid={choice.uuid}
												className={styles['choice-remove']}
											/>
										)}
									</li>
								);
							})}
						</ul>
					</div>
					<AllPrintingsFooter manager={manager} />
				</section>
			</div>
		</section>
	);
}
