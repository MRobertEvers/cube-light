import React from 'react';
import { DECK_BOARD_ORDER } from '../../../../../domain/deck/boards';
import { BoardChips } from 'src/ui/kit/components/OwnershipBadge/OwnershipBadge';
import type { ManagePrintingsProps } from './manage-printings.types';
import { useServerPrintings } from './use-card-printings';
import { setNameOf, totalOf, useManagePrintings } from './use-manage-printings';
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

/**
 * Edits how many copies of each printing of one card the deck holds in each board:
 * main and side steppers per printing, arrows that move a copy between the boards,
 * a way to move a whole row to another printing, and every printing of the card
 * beside them as images, where a click adds a copy to the chosen board. Every step
 * saves as it is taken. Phones show one side at a time.
 */
export function ManagePrintingsOnline(props: ManagePrintingsProps) {
	const { target } = props;
	const { printings, loading, loadError } = useServerPrintings(target.name);
	const manager = useManagePrintings(props, printings);
	const { rows, view, saving, saveError, replacingUuid, replacing } = manager;
	// Printings without an image can't be told apart, unless the deck already has them.
	const choices = manager.choices.filter(
		(printing) => !!printing.image || manager.initial.has(printing.uuid)
	);

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
					<ul className={styles['deck-rows']}>
						{rows.map((uuid) => (
							<li
								key={uuid}
								className={`${styles['deck-row']} ${
									replacingUuid === uuid ? styles['replacing'] : ''
								}`}
							>
								<img
									src={manager.rowPrinting(uuid).image}
									alt=""
									loading="lazy"
								/>
								<DeckPrintingText
									manager={manager}
									uuid={uuid}
									setLine={setNameOf(manager.rowPrinting(uuid))}
								/>
								<DeckRowControls
									manager={manager}
									uuid={uuid}
									changeDisabled={loading || !!loadError}
								/>
							</li>
						))}
					</ul>
					<DeckPaneActions manager={manager} addHint="Browse available sets" />
				</section>
				<section
					className={`${styles['pane']} ${styles['all-pane']}`}
					aria-labelledby="manage-printings-all"
				>
					<AllPrintingsHeader manager={manager} />
					<div className={styles['grid-scroll']}>
						{loading && (
							<p className={styles['message']} role="status">
								Loading printings…
							</p>
						)}
						{loadError && (
							<p className={styles['message']} role="alert">
								{loadError}
							</p>
						)}
						{!loading && !loadError && choices.length === 0 && (
							<p className={styles['message']}>{noChoicesMessage(manager)}</p>
						)}
						<ul className={styles['grid']}>
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
											className={styles['tile']}
											title={choice.label}
											aria-label={choice.actionLabel}
											disabled={choice.disabled}
											onClick={() => manager.choose(choice.uuid)}
										>
											<span className={styles['tile-image']}>
												<img
													src={choice.printing.image}
													alt=""
													loading="lazy"
												/>
												{totalOf(choice.counts) > 0 && (
													<span
														className={styles['badges']}
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
											</span>
											<span className={styles['tile-code']}>
												{choice.printing.setCode}
												{owned > 0 && (
													<>
														{' '}
														<BoardChips
															chips={[
																{
																	label: `own ${owned}`,
																	tone: 'owned'
																}
															]}
														/>
													</>
												)}
											</span>
											<span className={styles['tile-name']}>
												{choice.printing.setName ?? ' '}
											</span>
										</button>
										{choice.count > 0 && !replacing && (
											<ChoiceRemoveButton
												manager={manager}
												uuid={choice.uuid}
												className={styles['tile-remove']}
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
