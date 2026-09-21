import React, { useEffect, useMemo, useState } from 'react';
import {
	CardPrinting,
	fetchAPICardPrintings
} from '../../../../api/fetch-api-card-printings';
import type { DeckCardsEdit } from '../../../../api/fetch-api-edit-deck-card';
import type { DeckCardGroup } from '../../../../utils/group-deck-cards';

import { HeaderBackButton } from 'src/components/BackLink/BackLink';
import {
	HeaderBackSlot,
	HeaderBackSlotContext
} from 'src/components/Header/HeaderBackSlot';
import styles from './manage-printings.module.css';

const MAX_COPIES = 999;

type PrintingInfo = {
	uuid: string;
	setCode: string;
	setName: string | null;
	image: string | undefined;
};

export type ManagePrintingsProps = {
	group: DeckCardGroup;
	onSave: (edit: DeckCardsEdit) => Promise<void>;
	onCancel: () => void;
};

/**
 * Edits how many copies of each printing of one card a deck holds: steppers for the
 * printings in the deck beside every printing of the card, where a click adds a copy.
 * Phones show one side at a time.
 */
export function ManagePrintings(props: ManagePrintingsProps) {
	const { group, onSave, onCancel } = props;
	const initial = useMemo(
		() => new Map(group.printings.map((card) => [card.uuid, card.count])),
		[group]
	);
	const [counts, setCounts] = useState<ReadonlyMap<string, number>>(initial);
	// Printings listed on the deck side, in the order they joined it.
	const [order, setOrder] = useState(() =>
		group.printings.map((card) => card.uuid)
	);
	const [printings, setPrintings] = useState<CardPrinting[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [query, setQuery] = useState('');
	const [view, setView] = useState<'deck' | 'all'>('deck');
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	// State, not a ref, so the all printings pane portals in once the slot mounts.
	const [backSlot, setBackSlot] = useState<HTMLElement | null>(null);

	useEffect(() => {
		const controller = new AbortController();
		setLoading(true);
		void fetchAPICardPrintings(group.name, controller.signal)
			.then(setPrintings)
			.catch((error: unknown) => {
				if (!(
					error instanceof DOMException && error.name === 'AbortError'
				))
					setLoadError(
						'Other printings could not be loaded. You can still change the copies you have.'
					);
			})
			.finally(() => {
				if (!controller.signal.aborted) setLoading(false);
			});
		return () => controller.abort();
	}, [group.name]);

	useEffect(() => {
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && !saving) onCancel();
		};
		window.addEventListener('keydown', closeOnEscape);
		return () => window.removeEventListener('keydown', closeOnEscape);
	}, [onCancel, saving]);

	const info = useMemo(() => {
		const byUuid = new Map<string, PrintingInfo>();
		for (const printing of printings)
			byUuid.set(printing.uuid, {
				uuid: printing.uuid,
				setCode: printing.setCode,
				setName: printing.setName,
				image: printing.image ?? printing.art ?? undefined
			});
		for (const card of group.printings)
			if (!byUuid.has(card.uuid))
				byUuid.set(card.uuid, {
					uuid: card.uuid,
					setCode: card.setCode,
					setName: null,
					image: card.images?.normal ?? card.image
				});
		return byUuid;
	}, [printings, group.printings]);

	// Printings without an image can't be told apart, unless the deck already has them.
	// The deck's own printings come first, since a set can have several of the card.
	const choices = useMemo(() => {
		const needle = query.trim().toLowerCase();
		return printings
			.toSorted(
				(a, b) =>
					Number(initial.has(b.uuid)) - Number(initial.has(a.uuid))
			)
			.filter(
				(printing) => !!printing.image || initial.has(printing.uuid)
			)
			.filter(
				(printing) =>
					!needle ||
					printing.setCode.toLowerCase().includes(needle) ||
					!!printing.setName?.toLowerCase().includes(needle)
			);
	}, [printings, query, initial]);

	const countOf = (uuid: string) => counts.get(uuid) ?? 0;
	const rows = order.filter((uuid) => countOf(uuid) > 0);
	const total = rows.reduce((sum, uuid) => sum + countOf(uuid), 0);
	const edit: DeckCardsEdit = {
		remove: [...initial.keys()].filter((uuid) => countOf(uuid) === 0),
		upsert: rows
			.filter((uuid) => countOf(uuid) !== initial.get(uuid))
			.map((uuid) => ({ uuid, count: countOf(uuid) }))
	};
	const dirty = edit.remove.length > 0 || edit.upsert.length > 0;
	const unused = choices.filter((printing) => countOf(printing.uuid) === 0);

	const setCount = (uuid: string, count: number) => {
		const next = Math.max(0, Math.min(MAX_COPIES, count));
		setCounts((previous) => new Map(previous).set(uuid, next));
		if (next > 0)
			setOrder((previous) =>
				previous.includes(uuid) ? previous : [...previous, uuid]
			);
	};

	const save = async () => {
		if (!dirty || saving) return;
		setSaving(true);
		setSaveError(null);
		try {
			await onSave(edit);
		} catch {
			setSaveError('Unable to save these printings. Please try again.');
			setSaving(false);
		}
	};

	const summary = `${total} ${total === 1 ? 'copy' : 'copies'} across ${rows.length} ${rows.length === 1 ? 'printing' : 'printings'}`;
	const nameOf = (printing: PrintingInfo) =>
		printing.setName ?? printing.setCode;

	return (
		<section
			className={`${styles['container']} ${styles[`show-${view}`]}`}
			role="dialog"
			aria-modal="true"
			aria-labelledby="manage-printings-title"
			aria-busy={saving}
		>
			<header className={styles['header']}>
				<HeaderBackSlot ref={setBackSlot} />
				<div className={styles['title']}>
					<h2 id="manage-printings-title">{group.name}</h2>
					<p aria-live="polite">{summary}</p>
				</div>
				<div className={styles['header-actions']}>
					<button
						type="button"
						className={styles['cancel']}
						onClick={onCancel}
						disabled={saving}
					>
						Cancel
					</button>
					<button
						type="button"
						className={styles['save']}
						onClick={() => void save()}
						disabled={!dirty || saving}
					>
						{saving ? 'Saving…' : 'Save'}
					</button>
				</div>
				{saveError && (
					<p className={styles['save-error']} role="alert">
						{saveError}
					</p>
				)}
			</header>
			<HeaderBackSlotContext.Provider value={backSlot}>
				<div className={styles['body']}>
					<section
						className={`${styles['pane']} ${styles['deck-pane']}`}
						aria-labelledby="manage-printings-deck"
					>
						<h3
							id="manage-printings-deck"
							className={styles['pane-label']}
						>
							In this deck
						</h3>
						<ul className={styles['deck-rows']}>
							{rows.map((uuid) => {
								const printing = info.get(uuid)!;
								const count = countOf(uuid);
								const label = nameOf(printing);
								return (
									<li
										key={uuid}
										className={styles['deck-row']}
									>
										<img
											src={printing.image}
											alt=""
											loading="lazy"
										/>
										<div
											className={styles['deck-row-text']}
										>
											<span
												className={
													styles['deck-row-name']
												}
											>
												{label}
											</span>
											<span
												className={styles['set-code']}
											>
												{printing.setCode}
											</span>
										</div>
										<div className={styles['stepper']}>
											{count > 1 ? (
												<button
													type="button"
													aria-label={`Remove a ${label} copy`}
													disabled={saving}
													onClick={() =>
														setCount(
															uuid,
															count - 1
														)
													}
												>
													<MinusIcon />
												</button>
											) : (
												<button
													type="button"
													className={styles['remove']}
													aria-label={`Remove the ${label} printing`}
													disabled={saving}
													onClick={() =>
														setCount(uuid, 0)
													}
												>
													<TrashIcon />
												</button>
											)}
											<span
												className={
													styles['stepper-count']
												}
											>
												{count}
											</span>
											<button
												type="button"
												aria-label={`Add a ${label} copy`}
												disabled={
													saving ||
													count >= MAX_COPIES
												}
												onClick={() =>
													setCount(uuid, count + 1)
												}
											>
												<PlusIcon />
											</button>
										</div>
									</li>
								);
							})}
						</ul>
						{rows.length === 0 && (
							<p className={styles['empty']}>
								No copies left. Saving removes {group.name} from
								the deck.
							</p>
						)}
						<button
							type="button"
							className={styles['add-printing']}
							onClick={() => setView('all')}
						>
							<span
								className={styles['add-printing-icon']}
								aria-hidden="true"
							>
								<PlusIcon />
							</span>
							<span className={styles['add-printing-text']}>
								<span>Add a printing</span>
								<span>
									{loading
										? 'Loading printings…'
										: `${unused.length} more available`}
								</span>
							</span>
						</button>
						<div className={styles['total']}>
							<span>Total in deck</span>
							<strong>{total}</strong>
						</div>
					</section>
					<section
						className={`${styles['pane']} ${styles['all-pane']}`}
						aria-labelledby="manage-printings-all"
					>
						<div className={styles['all-header']}>
							{view === 'all' && (
								<HeaderBackButton
									label="Back to the printings in this deck"
									onClick={() => setView('deck')}
								/>
							)}
							<div className={styles['all-heading']}>
								<h3
									id="manage-printings-all"
									className={styles['pane-label']}
								>
									All printings
									{printings.length > 0 &&
										` (${printings.length})`}
								</h3>
								<p>Choose a printing to add a copy.</p>
							</div>
							<input
								className={styles['search']}
								type="search"
								placeholder="Search sets"
								aria-label="Search printings by set name or code"
								value={query}
								onChange={(event) =>
									setQuery(event.target.value)
								}
							/>
						</div>
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
								<p className={styles['message']}>
									{query.trim()
										? `No sets match “${query.trim()}”.`
										: 'No other printings found.'}
								</p>
							)}
							<ul className={styles['grid']}>
								{choices.map((choice) => {
									const printing = info.get(choice.uuid)!;
									const count = countOf(choice.uuid);
									const label = nameOf(printing);
									return (
										<li
											key={choice.uuid}
											className={
												count > 0
													? styles['in-deck']
													: undefined
											}
										>
											<button
												type="button"
												className={styles['tile']}
												title={label}
												aria-label={`Add a ${label} copy${count > 0 ? `, ${count} in deck` : ''}`}
												disabled={
													saving ||
													count >= MAX_COPIES
												}
												onClick={() =>
													setCount(
														choice.uuid,
														count + 1
													)
												}
											>
												<span
													className={
														styles['tile-image']
													}
												>
													<img
														src={printing.image}
														alt=""
														loading="lazy"
													/>
													{count > 0 && (
														<span
															className={
																styles['badge']
															}
															aria-hidden="true"
														>
															×{count}
														</span>
													)}
												</span>
												<span
													className={
														styles['tile-code']
													}
												>
													{printing.setCode}
												</span>
												<span
													className={
														styles['tile-name']
													}
												>
													{printing.setName ?? ' '}
												</span>
											</button>
											{count > 0 && (
												<button
													type="button"
													className={
														styles['tile-remove']
													}
													aria-label={`Remove a ${label} copy`}
													disabled={saving}
													onClick={() =>
														setCount(
															choice.uuid,
															count - 1
														)
													}
												>
													<span>
														<MinusIcon />
													</span>
												</button>
											)}
										</li>
									);
								})}
							</ul>
						</div>
						<div className={styles['all-footer']}>
							<span>{summary}</span>
							<button
								type="button"
								className={styles['done']}
								onClick={() => setView('deck')}
							>
								Done
							</button>
						</div>
					</section>
				</div>
			</HeaderBackSlotContext.Provider>
		</section>
	);
}

function MinusIcon() {
	return (
		<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
			<path
				d="M3.5 8h9"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
			/>
		</svg>
	);
}

function PlusIcon() {
	return (
		<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
			<path
				d="M8 3.5v9M3.5 8h9"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
			/>
		</svg>
	);
}

function TrashIcon() {
	return (
		<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
			<path
				d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.6"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
