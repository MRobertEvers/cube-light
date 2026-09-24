import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { OverflowMenu } from 'src/ui/kit/components/OverflowMenu/OverflowMenu';
import { SpotlightCard } from 'src/ui/features/SpotlightCard/SpotlightCard';
import { ManaCost } from 'src/ui/kit/components/ManaCost/ManaCost';
import type { DeckGroup, DeckSummaries, DeckSummary } from '../../../domain/models/deck';
import { groupDeckList } from '../../../domain/deck/deck-groups';
import { newId } from '../../../domain/ids';
import { loadDeckGroups, saveDeckGroups } from '../../../redux/deck-groups/deck-groups.thunks';
import { selectDeckGroups } from '../../../redux/deck-groups/deck-groups.selectors';
import { errorMessage } from '../../../redux/thunk';
import { createDeck, loadDecks } from '../../../redux/decks/decks.thunks';
import { selectDecks, selectDecksError } from '../../../redux/decks/decks.selectors';
import { setInitialDecks } from '../../../redux/decks/decksSlice';
import { useAppDispatch } from '../../../redux/use-app-dispatch';
import { useAppSelector } from '../../../redux/use-app-selector';
import { Page } from '../../kit/components/Page/Page';
import { Modal } from '../Deck/components/Modal';
import {
	NewDeckModal,
	NewDeckModalEvent,
	NewDeckModalEventType
} from './components/NewDeck';
import { DeckGroupDialog, type DeckGroupDraft } from './components/DeckGroupDialog';
import { ImageCardImport } from 'src/ui/kit/components/ImageCardImport/ImageCardImport';
import { useHistoryModal } from 'src/ui/kit/hooks/useHistoryModal';
import { useIsPhoneLayout } from 'src/ui/kit/hooks/useIsPhoneLayout';
import { CreateDeckChoice } from './components/CreateDeckChoice';

import styles from './home.module.css';

export type HomeProps = {
	initialData?: DeckSummaries;
};

function NewDeckIcon() {
	return (
		<>
			<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
				<path
					d="M12 5v14M5 12h14"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.8"
					strokeLinecap="round"
				/>
			</svg>
			<svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
				<path d="M1 3h8L5 7.5z" fill="currentColor" />
			</svg>
		</>
	);
}

type HomeModal =
	/** Asks whether to start an empty deck or one from an image. */
	| { type: 'create-choice' }
	| { type: 'new-deck' }
	| { type: 'image-import' }
	/** Edits a deck group, or creates one when `groupId` is null. */
	| { type: 'deck-group'; groupId: string | null };

function DeckTile(props: { deck: DeckSummary }) {
	const { deck } = props;
	return (
		<Link className={styles['deck-link']} to={`/deck/${deck.deckId}`}>
			<SpotlightCard
				name={deck.name}
				art={deck.art}
				bannerBlend={deck.bannerBlend}
				tile
				footer={
					deck.colors.length > 0 && (
						<span className={styles['deck-colors']}>
							<ManaCost
								cost={deck.colors.map((color) => `{${color}}`).join('')}
								label={`Colors: ${deck.colors.join('')}`}
							/>
						</span>
					)
				}
				createdAt={deck.createdAt}
				updatedAt={deck.updatedAt}
			/>
			{deck.tags.length > 0 && (
				<ul className={styles['deck-tags']} aria-label="Tags">
					{deck.tags.map((tag) => (
						<li key={tag}>{tag}</li>
					))}
				</ul>
			)}
		</Link>
	);
}

function DeckGrid(props: { decks: DeckSummary[] }) {
	return (
		<div className={styles['deck-grid']}>
			{props.decks.map((deck) => (
				<DeckTile key={deck.deckId} deck={deck} />
			))}
		</div>
	);
}

/** `groups` with the group at `index` swapped with its neighbour `offset` places away. */
function moveGroup(groups: DeckGroup[], index: number, offset: number): DeckGroup[] {
	const next = groups.slice();
	const target = index + offset;
	next[index] = groups[target];
	next[target] = groups[index];
	return next;
}

export function Home(props: HomeProps) {
	const { initialData } = props;
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const modalHistory = useHistoryModal<HomeModal>('home');
	const modal = modalHistory.value;
	const isPhoneLayout = useIsPhoneLayout();
	const data = useAppSelector(selectDecks);
	const error = useAppSelector(selectDecksError);
	const groups = useAppSelector(selectDeckGroups);
	const [groupSave, setGroupSave] = useState<{ saving: boolean; error: string | null }>({ saving: false, error: null });
	const list = useMemo(
		() => groupDeckList(data ?? [], groups ?? []),
		[data, groups]
	);
	const editingGroup =
		modal?.type === 'deck-group' && modal.groupId
			? (groups?.find((group) => group.groupId === modal.groupId) ?? null)
			: null;
	// A group deleted elsewhere has nothing left to edit.
	const groupDialogOpen =
		modal?.type === 'deck-group' && groups !== null && (!modal.groupId || !!editingGroup);

	useEffect(() => {
		if (initialData) dispatch(setInitialDecks(initialData));
		void dispatch(loadDecks());
		void dispatch(loadDeckGroups());
	}, [dispatch, initialData]);

	/** Saves every group; true once saved. */
	async function persistGroups(next: DeckGroup[]): Promise<boolean> {
		setGroupSave({ saving: true, error: null });
		try {
			await dispatch(saveDeckGroups(next));
			setGroupSave({ saving: false, error: null });
			return true;
		} catch (saveError) {
			setGroupSave({ saving: false, error: errorMessage(saveError, 'Unable to save deck groups. Please try again.') });
			return false;
		}
	}

	async function saveGroup(draft: DeckGroupDraft) {
		const current = groups ?? [];
		const next = editingGroup
			? current.map((group) =>
					group.groupId === editingGroup.groupId
						? { groupId: group.groupId, name: draft.name, tags: draft.tags, match: draft.match }
						: group
				)
			: current.concat([{ groupId: newId('group'), name: draft.name, tags: draft.tags, match: draft.match }]);
		if (await persistGroups(next)) modalHistory.close();
	}

	async function deleteGroup(groupId: string) {
		if (await persistGroups((groups ?? []).filter((group) => group.groupId !== groupId)))
			modalHistory.close();
	}

	function openGroupDialog(groupId: string | null) {
		setGroupSave({ saving: false, error: null });
		modalHistory.open({ type: 'deck-group', groupId });
	}

	const createDeckItems = (
		<>
			<button
				type="button"
				onClick={() => modalHistory.open({ type: 'new-deck' })}
			>
				New deck
			</button>
			<button
				type="button"
				onClick={() => modalHistory.open({ type: 'image-import' })}
			>
				New deck from image
			</button>
		</>
	);

	return (
		<Page
			chrome={{
				desktop: (
					<OverflowMenu
						label="Create a deck"
						icon={<NewDeckIcon />}
						triggerClassName={styles['new-deck-trigger']}
					>
						{createDeckItems}
					</OverflowMenu>
				),
				mobile: createDeckItems
			}}
		>
			{modal?.type === 'create-choice' && (
				<CreateDeckChoice
					onNewDeck={() => modalHistory.open({ type: 'new-deck' })}
					onImageImport={() => modalHistory.open({ type: 'image-import' })}
					onClose={modalHistory.close}
				/>
			)}
			{modal?.type === 'image-import' && (
				<ImageCardImport
					mode="create"
					onClose={modalHistory.close}
					onComplete={(deckId, taskId) => {
						navigate(
							taskId
								? `/deck/${deckId}/scan/${taskId}`
								: `/deck/${deckId}`,
							{ replace: true }
						);
					}}
				/>
			)}
			{modal?.type === 'new-deck' && (
				<NewDeckModal
					onEvent={async (e: NewDeckModalEvent) => {
						if (e.type === NewDeckModalEventType.CLOSE) {
							modalHistory.close();
						} else {
							const deckId = await dispatch(createDeck(e.payload));

							navigate(`/deck/${deckId}`, {
								replace: true
							});
						}
					}}
				/>
			)}
			{groupDialogOpen && modal?.type === 'deck-group' && (
				<Modal fullScreenOnMobile>
					<DeckGroupDialog
						key={modal.groupId ?? 'new'}
						group={editingGroup}
						decks={data ?? []}
						saving={groupSave.saving}
						error={groupSave.error}
						onSave={(draft) => void saveGroup(draft)}
						onDelete={
							editingGroup
								? () => void deleteGroup(editingGroup.groupId)
								: undefined
						}
						onClose={modalHistory.close}
					/>
				</Modal>
			)}
			<main className={styles['home-container']}>
				<div className={styles['heading']}>
					<div>
						<h1>Your decks</h1>
						<p>Pick a deck to view its cards and make changes.</p>
					</div>
					<button
						type="button"
						className={styles['new-group']}
						disabled={groups === null}
						onClick={() => openGroupDialog(null)}
					>
						New group
					</button>
				</div>
				{error && <p role="alert">Unable to refresh decks.</p>}
				{groupSave.error && !groupDialogOpen && (
					<p className={styles['group-error']} role="alert">
						{groupSave.error}
					</p>
				)}
				{list.sections.map((section, index) => {
					const { group, decks } = section;
					const headingId = `deck-group-${group.groupId}`;
					return (
						<section
							key={group.groupId}
							className={styles['group']}
							aria-labelledby={headingId}
						>
							<header className={styles['group-heading']}>
								<div>
									<h2 id={headingId}>{group.name}</h2>
									<p>
										{group.tags.length === 1
											? 'Tagged '
											: group.match === 'all'
												? 'All of '
												: 'Any of '}
										{group.tags.join(', ')}
										{' · '}
										{decks.length} {decks.length === 1 ? 'deck' : 'decks'}
									</p>
								</div>
								<OverflowMenu label={`Actions for ${group.name}`}>
									<button
										type="button"
										onClick={() => openGroupDialog(group.groupId)}
									>
										Edit group
									</button>
									{index > 0 && (
										<button
											type="button"
											disabled={groupSave.saving}
											onClick={() => void persistGroups(moveGroup(groups ?? [], index, -1))}
										>
											Move up
										</button>
									)}
									{index < list.sections.length - 1 && (
										<button
											type="button"
											disabled={groupSave.saving}
											onClick={() => void persistGroups(moveGroup(groups ?? [], index, 1))}
										>
											Move down
										</button>
									)}
								</OverflowMenu>
							</header>
							{decks.length > 0 ? (
								<DeckGrid decks={decks} />
							) : (
								<p className={styles['group-empty']}>
									No decks have {group.match === 'all' ? 'all of ' : ''}
									these tags yet.
								</p>
							)}
						</section>
					);
				})}
				{list.sections.length > 0 ? (
					list.ungrouped.length > 0 && (
						<section className={styles['group']} aria-labelledby="deck-group-other">
							<header className={styles['group-heading']}>
								<div>
									<h2 id="deck-group-other">Other decks</h2>
									<p>Decks no group includes</p>
								</div>
							</header>
							<DeckGrid decks={list.ungrouped} />
						</section>
					)
				) : (
					<DeckGrid decks={list.ungrouped} />
				)}
			</main>
			{isPhoneLayout && (
				<button
					type="button"
					className={styles['add-deck-button']}
					aria-label="Create a deck"
					onClick={() => modalHistory.open({ type: 'create-choice' })}
				>
					<svg
						viewBox="0 0 24 24"
						width="28"
						height="28"
						aria-hidden="true"
					>
						<path d="M12 5v14M5 12h14" />
					</svg>
				</button>
			)}
		</Page>
	);
}
