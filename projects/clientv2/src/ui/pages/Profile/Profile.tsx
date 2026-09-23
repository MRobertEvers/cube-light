import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { CardPrinting } from '../../../domain/models/card';
import type { ProfileCrop, UserProfile } from '../../../domain/models/session';
import { useAppDispatch } from '../../../state/use-app-dispatch';
import { readAllCardNames, readCardPrintings } from '../../../state/cards/cards.thunks';
import { saveProfileArt } from '../../../state/session/session.state';
import { errorMessage } from '../../../state/thunk';
import { useAuth } from '../../kit/components/Auth/AuthGate';
import { Page } from '../../kit/components/Page/Page';
import { PrintingPicker } from '../../kit/components/PrintingPicker/PrintingPicker';
import { SuggestionInput } from '../../kit/components/SuggestionInput/SuggestionInput';
import { UserBop } from '../../kit/components/UserBop/UserBop';
import styles from './profile.module.css';

const DEFAULT_CROP: ProfileCrop = { x: 0.5, y: 0.5, zoom: 1 };

export function Profile() {
	const { user } = useAuth();
	const dispatch = useAppDispatch();
	const saved = user.profile;
	const [names, setNames] = useState<string[]>([]);
	const [namesError, setNamesError] = useState(false);
	const [query, setQuery] = useState(saved?.cardName ?? '');
	const [chosenName, setChosenName] = useState(saved?.cardName ?? '');
	const [suggestionsOpen, setSuggestionsOpen] = useState(false);
	const [printings, setPrintings] = useState<CardPrinting[]>([]);
	const [selectedUuid, setSelectedUuid] = useState<string | null>(
		saved?.cardUuid ?? null
	);
	const [crop, setCrop] = useState<ProfileCrop>(
		saved?.crop ?? DEFAULT_CROP
	);
	const [loadingPrintings, setLoadingPrintings] = useState(false);
	const [printingsError, setPrintingsError] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [savedMessage, setSavedMessage] = useState('');
	const printingRequest = useRef(0);

	useEffect(() => {
		let current = true;
		dispatch(readAllCardNames()).then(
			(items) => {
				if (current) setNames(items);
			},
			() => {
				if (current) setNamesError(true);
			}
		);
		return function () {
			current = false;
		};
	}, [dispatch]);

	useEffect(() => {
		if (saved?.cardName) void loadPrintings(saved.cardName, saved.cardUuid);
		return function () {
			printingRequest.current += 1;
		};
	}, []);

	const matches = useMemo(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return names.slice(0, 10);
		return names
			.filter((name) => name.toLowerCase().includes(needle))
			.slice(0, 10);
	}, [names, query]);

	const selected = printings.find((item) => item.uuid === selectedUuid);
	const selectedArt =
		selected?.art ??
		(selectedUuid === saved?.cardUuid ? saved.art : null);
	const editingName = query !== chosenName;
	const draft: UserProfile | null =
		chosenName && selectedUuid && selectedArt
			? {
					cardName: chosenName,
					cardUuid: selectedUuid,
					art: selectedArt,
					crop
				}
			: null;
	const changed = !!draft && JSON.stringify(draft) !== JSON.stringify(saved);

	async function loadPrintings(name: string, preferredUuid?: string | null) {
		const request = ++printingRequest.current;
		setLoadingPrintings(true);
		setPrintingsError(false);
		setPrintings([]);
		setSelectedUuid(preferredUuid ?? null);
		try {
			const items = (await dispatch(readCardPrintings(name))).filter(
				(item) => !!item.art
			);
			if (request !== printingRequest.current) return;
			setPrintings(items);
			setSelectedUuid(
				items.some((item) => item.uuid === preferredUuid)
					? (preferredUuid ?? null)
					: (items[0]?.uuid ?? null)
			);
		} catch {
			if (request !== printingRequest.current) return;
			setPrintings([]);
			setPrintingsError(true);
		} finally {
			if (request === printingRequest.current) setLoadingPrintings(false);
		}
	}

	function chooseName(name: string) {
		setQuery(name);
		setChosenName(name);
		setSuggestionsOpen(false);
		setCrop(saved?.cardName === name ? saved.crop : DEFAULT_CROP);
		setSaveError(null);
		setSavedMessage('');
		void loadPrintings(
			name,
			saved?.cardName === name ? saved.cardUuid : null
		);
	}

	function choosePrinting(uuid: string) {
		setSelectedUuid(uuid);
		setCrop(saved?.cardUuid === uuid ? saved.crop : DEFAULT_CROP);
		setSaveError(null);
		setSavedMessage('');
	}

	async function save() {
		if (!draft || editingName || !changed || saving) return;
		setSaving(true);
		setSaveError(null);
		setSavedMessage('');
		try {
			await dispatch(saveProfileArt(draft)).unwrap();
			setSavedMessage('Profile art saved.');
		} catch (error) {
			setSaveError(errorMessage(error, 'Could not save your profile.'));
		} finally {
			setSaving(false);
		}
	}

	const placeholder = loadingPrintings ? (
		<p role="status">Loading printings…</p>
	) : printingsError ? (
		<p role="alert">Unable to load printings. Choose the card again.</p>
	) : chosenName && !editingName ? (
		<p>No artwork is available for this card.</p>
	) : (
		<p>Choose a card above to see its printings.</p>
	);

	return (
		<Page>
			<main className={styles.page}>
				<header className={styles.heading}>
					<div>
						<h1>Your profile</h1>
						<p>
							Choose card art and frame the part that appears in your user
							icon.
						</p>
					</div>
					<button
						type="button"
						className={styles.primary}
						disabled={!draft || editingName || !changed || saving}
						onClick={() => void save()}
					>
						{saving ? 'Saving…' : 'Save profile'}
					</button>
				</header>
				{savedMessage && (
					<p className={styles.success} role="status">
						{savedMessage}
					</p>
				)}
				{saveError && (
					<p className={styles.error} role="alert">
						{saveError}
					</p>
				)}
				<div className={styles.layout}>
					<section className={styles.card} aria-labelledby="profile-card-heading">
						<h2 id="profile-card-heading">Card artwork</h2>
						<p className={styles.intro}>
							Search any card, then choose the printing whose art you want.
						</p>
						<label htmlFor="profile-card-search">Card name</label>
						<SuggestionInput
							id="profile-card-search"
							value={query}
							suggestions={matches}
							open={suggestionsOpen}
							onOpenChange={setSuggestionsOpen}
							onChange={(value) => {
								setQuery(value);
								setSuggestionsOpen(true);
								setSavedMessage('');
							}}
							onSelect={chooseName}
							enterSelects={matches[0]}
							placeholder="Search card names"
							listLabel="Card names"
						/>
						{namesError && (
							<p className={styles.error} role="alert">
								Card search is unavailable right now.
							</p>
						)}
						<h3>
							{chosenName && !editingName
								? `Printings of ${chosenName}`
								: 'Printings'}
						</h3>
						<PrintingPicker
							printings={!editingName ? printings : []}
							selectedUuid={selectedUuid}
							onSelect={choosePrinting}
							name="profile-printing"
							image="art"
							placeholder={placeholder}
							aria-label="Choose profile artwork printing"
						/>
					</section>
					<section className={`${styles.card} ${styles.editor}`} aria-labelledby="crop-heading">
						<h2 id="crop-heading">Frame your icon</h2>
						<p className={styles.intro}>
							Drag the artwork in the circle, then fine-tune the crop.
						</p>
						<div className={styles.preview}>
							<UserBop profile={draft} size="preview" onCropChange={setCrop} />
						</div>
						{draft ? (
							<>
								<p className={styles.caption}>
									<strong>{draft.cardName}</strong>
									{selected?.setCode && ` · ${selected.setCode}`}
								</p>
								<CropControl
									label="Zoom"
									value={crop.zoom}
									min={1}
									max={3}
									onChange={(zoom) => setCrop({ ...crop, zoom })}
								/>
								<CropControl
									label="Move left / right"
									value={crop.x}
									onChange={(x) => setCrop({ ...crop, x })}
								/>
								<CropControl
									label="Move up / down"
									value={crop.y}
									onChange={(y) => setCrop({ ...crop, y })}
								/>
								<button
									type="button"
									className={styles.reset}
									onClick={() => setCrop(DEFAULT_CROP)}
								>
									Reset crop
								</button>
							</>
						) : (
							<p className={styles.empty}>Choose artwork to start framing your icon.</p>
						)}
					</section>
				</div>
			</main>
		</Page>
	);
}

function CropControl(props: {
	label: string;
	value: number;
	min?: number;
	max?: number;
	onChange: (value: number) => void;
}) {
	const { label, value, min = 0, max = 1, onChange } = props;
	return (
		<label className={styles.range}>
			<span>{label}</span>
			<input
				type="range"
				min={min}
				max={max}
				step="0.01"
				value={value}
				onChange={(event) => onChange(Number(event.target.value))}
			/>
		</label>
	);
}
