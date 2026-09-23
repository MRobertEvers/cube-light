import React from 'react';
import type { GroupedDeck } from '../../../domain/deck/grouping';
import {
	BannerCrop,
	BannerFrame,
	DEFAULT_BANNER_CROP,
	MAX_MASKED_BANNER_X
} from '../../../domain/appearance/banner-crop';
import type { CardPalette } from '../../../domain/appearance/card-palette';
import { DeckFullArtTop } from '../../kit/components/DeckFullArtTop/DeckFullArtTop';
import { SpotlightCard } from '../../features/SpotlightCard/SpotlightCard';
import { openBannerPicker } from '../../../redux/banner-picker/bannerPickerSlice';
import { type OpenBannerPickerPayload } from '../../../redux/banner-picker/banner-picker.types';
import { appearanceActions } from '../../../redux/appearance-settings/appearanceSettingsSlice';
import { appearanceView } from '../../../redux/appearance-settings/appearance-settings.selectors';
import { saveCrop, savePalette, saveStyle, saveBlend, saveVisualization } from '../../../redux/appearance-settings/appearance-settings.thunks';
import { BOARD_VISUALIZATIONS } from '../../features/boards/board-visualizations';
import {
	artworkKey,
	BANNER_BLEND_ALGORITHM_VERSION,
	defaultSubjectProtection,
	type BannerBlendConfig
} from '../../../domain/appearance/banner-blend';
import { SubjectProtection } from './components/SubjectProtection/SubjectProtection';
import { useAppDispatch } from '../../../redux/use-app-dispatch';
import { useBannerBlendPreview } from '../../kit/hooks/useBannerBlendPreview';
import styles from './deck-settings.module.css';

type SettingsView = ReturnType<typeof appearanceView>;
type SectionProps = {
	deckId: string;
	data: GroupedDeck;
	view: SettingsView;
};

const COLOR_LABELS: Array<{
	key: keyof CardPalette;
	label: string;
	description: string;
}> = [
	{
		key: 'accent',
		label: 'Accent',
		description: 'Headings, links and highlights'
	},
	{
		key: 'surface',
		label: 'Surface',
		description: 'Banner and section backgrounds'
	},
	{ key: 'wash', label: 'Page', description: 'The page background tint' },
	{ key: 'border', label: 'Border', description: 'Outlines and separators' }
];

function bannerCard(data: GroupedDeck) {
	return (
		data.bannerCard ??
		data.cards.find((card) => card.uuid === data.bannerCardUuid) ??
		data.cards.find((card) => !!card.art)
	);
}

/** Sticky card header that keeps the card's title, card-wide actions and save status in view while scrolling. */
function EditorHeader(
	props: React.PropsWithChildren<{
		id: string;
		title: string;
		badge?: React.ReactNode;
		actions: React.ReactNode;
	}>
) {
	const { id, title, badge, actions, children } = props;
	return (
		<header className={styles['editor-header']}>
			<div className={styles['editor-header-row']}>
				<div className={styles['editor-title']}>
					<h2 id={id}>{title}</h2>
					{badge}
				</div>
				<div className={styles['actions']}>{actions}</div>
			</div>
			{children}
		</header>
	);
}

export function BannerCardSection(
	props: SectionProps & {
		onPickerOpened?: (payload: OpenBannerPickerPayload) => void;
	}
) {
	const { deckId, data, view, onPickerOpened } = props;
	const dispatch = useAppDispatch();
	const card = bannerCard(data);
	const names = [...new Set(data.cards.map((item) => item.name))].sort(
		(a, b) => a.localeCompare(b)
	);
	return (
		<section
			className={`${styles['editor']} ${styles['banner-editor']}`}
			aria-labelledby="banner-card-heading"
		>
			<EditorHeader
				id="banner-card-heading"
				title="Banner card"
				actions={
					<button
						type="button"
						className={styles['primary']}
						disabled={names.length === 0}
						onClick={() => {
							const payload: OpenBannerPickerPayload = {
								deckId,
								names,
								deckCardUuids: data.cards.map(
									(item) => item.uuid
								),
								currentName:
									card && names.includes(card.name)
										? card.name
										: '',
								currentUuid: data.bannerCardUuid
							};
							dispatch(appearanceActions.bannerPickerOpened());
							dispatch(openBannerPicker(payload));
							onPickerOpened?.(payload);
						}}
					>
						Choose banner artwork
					</button>
				}
			>
				{view.status.banner.message && (
					<p className={styles['success']} role="status">
						{view.status.banner.message}
					</p>
				)}
			</EditorHeader>
			<p className={styles['intro']}>
				Choose a card in this deck and preview its printings. Saving new
				artwork resets the banner crop.
			</p>
			{card?.art && (
				<div className={styles['current-banner']}>
					<img src={card.art} alt="" />
					<span>
						<strong>{card.name}</strong>
						<small>{card.setCode}</small>
					</span>
				</div>
			)}
			{names.length === 0 && (
				<p>Add a card to your deck to choose banner artwork.</p>
			)}
		</section>
	);
}

export function TopStyleSection(props: SectionProps) {
	const { deckId, view } = props;
	const dispatch = useAppDispatch();
	const { style, styleChanged, status } = view;
	return (
		<section
			className={`${styles['editor']} ${styles['style-editor']}`}
			aria-labelledby="style-heading"
		>
			<EditorHeader
				id="style-heading"
				title="Deck top style"
				actions={
					<button
						type="button"
						className={styles['primary']}
						onClick={() =>
							void dispatch(saveStyle({ deckId, style }))
						}
						disabled={!styleChanged || status.style.saving}
					>
						{status.style.saving ? 'Saving…' : 'Save top style'}
					</button>
				}
			>
				{status.style.message && (
					<p className={styles['success']} role="status">
						{status.style.message}
					</p>
				)}
				{status.style.error && (
					<p className={styles['error']} role="alert">
						{status.style.error}
					</p>
				)}
			</EditorHeader>
			<div className={styles['style-options']}>
				<label className={styles['style-option']}>
					<input
						type="radio"
						name="deck-top-style"
						value="card"
						checked={style === 'card'}
						onChange={() =>
							dispatch(appearanceActions.changeStyle('card'))
						}
					/>
					<span>
						<strong>Banner card</strong>
						<small>
							Card artwork and name in a framed banner above the
							list.
						</small>
					</span>
				</label>
				<label className={styles['style-option']}>
					<input
						type="radio"
						name="deck-top-style"
						value="full-art"
						checked={style === 'full-art'}
						onChange={() =>
							dispatch(appearanceActions.changeStyle('full-art'))
						}
					/>
					<span>
						<strong>Full-width art</strong>
						<small>
							Artwork spans the page and fades into the card list.
						</small>
					</span>
				</label>
			</div>
		</section>
	);
}

export function VisualizationSection(props: SectionProps) {
	const { deckId, view } = props;
	const dispatch = useAppDispatch();
	const { visualization, visualizationChanged, status } = view;
	return (
		<section
			className={`${styles['editor']} ${styles['style-editor']}`}
			aria-labelledby="visualization-heading"
		>
			<EditorHeader
				id="visualization-heading"
				title="Card view"
				actions={
					<button
						type="button"
						className={styles['primary']}
						onClick={() =>
							void dispatch(
								saveVisualization({ deckId, visualization })
							)
						}
						disabled={
							!visualizationChanged || status.visualization.saving
						}
					>
						{status.visualization.saving
							? 'Saving…'
							: 'Save card view'}
					</button>
				}
			>
				{status.visualization.message && (
					<p className={styles['success']} role="status">
						{status.visualization.message}
					</p>
				)}
				{status.visualization.error && (
					<p className={styles['error']} role="alert">
						{status.visualization.error}
					</p>
				)}
			</EditorHeader>
			<div className={styles['style-options']}>
				{BOARD_VISUALIZATIONS.map((option) => (
					<label key={option.id} className={styles['style-option']}>
						<input
							type="radio"
							name="deck-board-visualization"
							value={option.id}
							checked={visualization === option.id}
							onChange={() =>
								dispatch(
									appearanceActions.changeVisualization(
										option.id
									)
								)
							}
						/>
						<span>
							<strong>{option.label}</strong>
							<small>{option.description}</small>
						</span>
					</label>
				))}
			</div>
		</section>
	);
}

export function CropSection(props: SectionProps) {
	const { deckId, data, view } = props;
	const dispatch = useAppDispatch();
	const { crop, cropChanged, style, status, blend } = view;
	const card = bannerCard(data);
	const bannerName = card?.name ?? data.name;
	const bannerArt = card?.art ?? data.icon;
	// Moving the art re-runs the blend (with any subject selection) against data.icon, the source the saved blend renders.
	const preview = useBannerBlendPreview(
		data.icon,
		crop,
		blend,
		cropChanged && style === 'card' && !status.crop.saving
	);
	const previewBlend = cropChanged
		? { config: blend, images: preview.images }
		: data.bannerBlend;
	const firstGroupName =
		Object.keys(data.deck.cardCategories).find(
			(name) => !name.includes('Land')
		) ?? Object.keys(data.deck.cardCategories)[0];
	const firstGroup = firstGroupName
		? data.deck.cardCategories[firstGroupName]
		: undefined;
	function updateCrop(variant: keyof BannerCrop, frame: BannerFrame) {
		return dispatch(
			appearanceActions.changeCrop({ ...crop, [variant]: frame })
		);
	}
	return (
		<section
			className={`${styles['editor']} ${styles['crop-editor']}`}
			aria-labelledby="crop-heading"
		>
			<EditorHeader
				id="crop-heading"
				title="Banner artwork"
				actions={
					<button
						type="button"
						className={styles['primary']}
						onClick={() =>
							void dispatch(
								saveCrop({ deckId, crop, config: blend })
							)
						}
						disabled={
							(!cropChanged && !status.crop.error) ||
							status.crop.saving ||
							status.blend.saving ||
							!bannerArt
						}
					>
						{status.crop.saving
							? 'Generating and saving…'
							: 'Save banner crop'}
					</button>
				}
			>
				{status.crop.message && (
					<p className={styles['success']} role="status">
						{status.crop.message}
					</p>
				)}
				{status.crop.error && (
					<p className={styles['error']} role="alert">
						{status.crop.error}
					</p>
				)}
			</EditorHeader>
			<p className={styles['intro']}>
				Drag the artwork in each deck-page preview, then adjust zoom or
				position. Desktop and mobile are saved separately.
			</p>
			{!bannerArt ? (
				<p>Add a card to your deck to choose banner artwork.</p>
			) : (
				<div className={styles['crop-views']}>
					{(['desktop', 'mobile'] as const).map((variant) => (
						<div className={styles['crop-view']} key={variant}>
							<div className={styles['crop-view-heading']}>
								<h3>
									{variant === 'desktop'
										? 'Desktop'
										: 'Mobile'}
								</h3>
								<button
									type="button"
									className={styles['reset']}
									onClick={() =>
										updateCrop(variant, {
											...DEFAULT_BANNER_CROP[variant]
										})
									}
									disabled={status.crop.saving}
								>
									Reset
								</button>
							</div>
							<div
								className={`${styles['crop-preview']} ${styles[variant]} ${style === 'card' ? styles['card-preview'] : styles['full-preview']}`}
							>
								{style === 'card' ? (
									<SpotlightCard
										art={bannerArt}
										crop={crop}
										name={bannerName}
										variant={variant}
										preview
										bannerBlend={previewBlend}
										onCropChange={(_, frame) =>
											updateCrop(variant, frame)
										}
									/>
								) : (
									<>
										<DeckFullArtTop
											src={bannerArt}
											crop={crop}
											name={bannerName}
											variant={variant}
											onCropChange={(_, frame) =>
												updateCrop(variant, frame)
											}
										/>
										{firstGroup && (
											<div
												className={
													styles['full-list-preview']
												}
											>
												{firstGroupName} (
												{firstGroup.count})
											</div>
										)}
									</>
								)}
							</div>
							<label className={styles['range-label']}>
								Zoom
								<input
									type="range"
									min="1"
									max="3"
									step="0.01"
									value={crop[variant].zoom}
									onChange={(event) =>
										updateCrop(variant, {
											...crop[variant],
											zoom: Number(event.target.value)
										})
									}
								/>
							</label>
							<label className={styles['range-label']}>
								Move left / right
								<input
									type="range"
									min="0"
									max={
										style === 'card'
											? MAX_MASKED_BANNER_X
											: 1
									}
									step="0.01"
									value={Math.min(
										crop[variant].x,
										style === 'card'
											? MAX_MASKED_BANNER_X
											: 1
									)}
									onChange={(event) =>
										updateCrop(variant, {
											...crop[variant],
											x: Number(event.target.value)
										})
									}
								/>
							</label>
							<label className={styles['range-label']}>
								Move up / down
								<input
									type="range"
									min="0"
									max="1"
									step="0.01"
									value={crop[variant].y}
									onChange={(event) =>
										updateCrop(variant, {
											...crop[variant],
											y: Number(event.target.value)
										})
									}
								/>
							</label>
						</div>
					))}
				</div>
			)}
			{preview.rendering && (
				<p role="status">Re-applying the banner blend…</p>
			)}
			{preview.error && (
				<p className={styles['error']} role="alert">
					{preview.error}
				</p>
			)}
		</section>
	);
}

export function BlendSection(props: SectionProps) {
	const { deckId, data, view } = props;
	const dispatch = useAppDispatch();
	const { blend, status, cropChanged } = view;
	function change(update: Partial<BannerBlendConfig>) {
		return dispatch(appearanceActions.changeBlend({ ...blend, ...update }));
	}
	const busy = status.blend.saving || status.crop.saving;
	const art = data.icon;
	// A selection drawn on other artwork does not apply; the editor starts fresh for this art.
	const protection =
		art &&
		blend.protection &&
		artworkKey(blend.protection.source) === artworkKey(art)
			? blend.protection
			: null;
	const progress = status.blend.saving
		? status.blend.progress
		: status.crop.saving
			? status.crop.progress
			: null;
	return (
		<section
			className={`${styles.editor} ${styles['crop-editor']}`}
			aria-labelledby="blend-heading"
		>
			<EditorHeader
				id="blend-heading"
				title="Banner edge blend"
				actions={
					<button
						type="button"
						className={styles.primary}
						disabled={busy || cropChanged || !art}
						onClick={() =>
							void dispatch(saveBlend({ deckId, config: blend }))
						}
					>
						{status.blend.saving
							? 'Generating…'
							: 'Generate and save blend'}
					</button>
				}
			>
				{cropChanged && (
					<p className={styles.note}>
						Save the banner crop before generating a new blend.
					</p>
				)}
				{progress != null && (
					<progress
						className={styles.progress}
						value={progress}
						max={1}
						aria-label="Banner generation progress"
					/>
				)}
				{status.blend.message && (
					<p role="status" className={styles.success}>
						{status.blend.message}
					</p>
				)}
				{status.blend.error && (
					<p role="alert" className={styles.error}>
						{status.blend.error}
					</p>
				)}
			</EditorHeader>
			<p className={styles.intro}>
				Choose how the artwork meets the card background, then generate
				to update the previews above. Saved banners are reused on every
				visit.
			</p>
			<fieldset className={styles['blend-controls']} disabled={busy}>
				<label>
					Background blend
					<select
						aria-label="Blend method"
						value={blend.method}
						onChange={(event) =>
							change({
								method: event.target
									.value as BannerBlendConfig['method']
							})
						}
					>
						<option value="multiband">
							Multiband — preserve texture and blend broad colors
						</option>
						<option value="poisson">
							Poisson — match local contrast and boundary colors
						</option>
						<option value="fade">
							Soft fade — simple opacity transition
						</option>
					</select>
				</label>
				<label className={styles['blend-checkbox']}>
					<input
						type="checkbox"
						checked={blend.contentAware}
						onChange={(event) =>
							change({
								contentAware: event.target.checked
							})
						}
					/>
					Place the transition away from detailed areas
				</label>
				<label className={styles['range-label']}>
					Transition position ({Math.round(blend.position * 100)}%)
					<input
						aria-label="Blend transition position"
						type="range"
						min="0.35"
						max="0.55"
						step="0.01"
						value={blend.position}
						onChange={(event) =>
							change({
								position: Number(event.target.value)
							})
						}
					/>
				</label>
				<label className={styles['range-label']}>
					Transition width ({Math.round(blend.width * 100)}%)
					<input
						aria-label="Blend transition width"
						type="range"
						min="0.08"
						max="0.24"
						step="0.01"
						value={blend.width}
						onChange={(event) =>
							change({
								width: Number(event.target.value)
							})
						}
					/>
				</label>
				<label className={styles['blend-checkbox']}>
					Card background
					<input
						type="color"
						value={blend.surface}
						onChange={(event) =>
							change({ surface: event.target.value })
						}
					/>
				</label>
				<label className={styles['blend-checkbox']}>
					<input
						type="checkbox"
						checked={blend.protectSubject}
						disabled={!art}
						onChange={(event) =>
							change({
								protectSubject: event.target.checked,
								protection:
									event.target.checked && art && !protection
										? defaultSubjectProtection(art)
										: blend.protection
							})
						}
					/>
					Protect subject — keep the character’s outline and blend
					only the background around it
				</label>
				{blend.protectSubject && art && (
					<>
						<SubjectProtection
							key={art}
							src={art}
							protection={protection}
							feather={blend.feather}
							disabled={busy}
							onChange={(next) => change({ protection: next })}
						/>
						<label className={styles['range-label']}>
							Edge feather ({blend.feather} px)
							<input
								aria-label="Subject edge feather"
								type="range"
								min="1"
								max="12"
								step="1"
								value={blend.feather}
								onChange={(event) =>
									change({
										feather: Number(event.target.value)
									})
								}
							/>
						</label>
						<label className={styles['range-label']}>
							Edge color cleanup (
							{Math.round(blend.decontamination * 100)}%)
							<input
								aria-label="Edge color decontamination strength"
								type="range"
								min="0"
								max="1"
								step="0.05"
								value={blend.decontamination}
								onChange={(event) =>
									change({
										decontamination: Number(
											event.target.value
										)
									})
								}
							/>
						</label>
					</>
				)}
			</fieldset>
			{!data.bannerBlend?.images && (
				<p>
					No blend has been generated for this artwork and crop yet.
					The deck shows a simple fade until you generate one.
				</p>
			)}
			{data.bannerBlend?.images &&
				view.savedBlend.version < BANNER_BLEND_ALGORITHM_VERSION && (
					<p>
						These banners were made with an earlier blend version.
						They are kept until you generate again.
					</p>
				)}
		</section>
	);
}

export function PaletteSection(props: SectionProps) {
	const { deckId, data, view } = props;
	const dispatch = useAppDispatch();
	const { palette, selectedPalette, isAuto, paletteChanged, status } = view;
	return (
		<>
			<section
				className={styles['editor']}
				aria-labelledby="palette-heading"
			>
				<EditorHeader
					id="palette-heading"
					title="Page palette"
					badge={
						<span className={styles['mode']}>
							{isAuto ? 'From banner card' : 'Custom'}
						</span>
					}
					actions={
						<>
							<button
								type="button"
								className={styles['secondary']}
								onClick={() =>
									dispatch(appearanceActions.useCardColors())
								}
								disabled={isAuto || status.palette.saving}
							>
								Use card colors
							</button>
							<button
								type="button"
								className={styles['primary']}
								onClick={() =>
									void dispatch(
										savePalette({
											deckId,
											palette: selectedPalette
										})
									)
								}
								disabled={
									!paletteChanged || status.palette.saving
								}
							>
								{status.palette.saving
									? 'Saving…'
									: 'Save palette'}
							</button>
						</>
					}
				>
					{status.palette.message && (
						<p className={styles['success']} role="status">
							{status.palette.message}
						</p>
					)}
					{status.palette.error && (
						<p className={styles['error']} role="alert">
							{status.palette.error}
						</p>
					)}
				</EditorHeader>
				<p className={styles['intro']}>
					Use colors from the banner card, or adjust each color for
					this deck.
				</p>
				<div className={styles['colors']}>
					{COLOR_LABELS.map((args) => {
						const { key, label, description } = args;
						return (
							<label className={styles['color-row']} key={key}>
								<input
									type="color"
									value={palette[key]}
									onChange={(event) =>
										dispatch(
											appearanceActions.changePaletteColor(
												{
													key,
													value: event.target.value,
													palette
												}
											)
										)
									}
									aria-label={`${label} color`}
								/>
								<span className={styles['color-copy']}>
									<strong>{label}</strong>
									<small>{description}</small>
								</span>
								<code>{palette[key].toUpperCase()}</code>
							</label>
						);
					})}
				</div>
			</section>
			<section className={styles['preview']} aria-label="Palette preview">
				<div className={styles['art']}>
					{data.icon && <img src={data.icon} alt="" />}
				</div>
				<div className={styles['preview-content']}>
					<span className={styles['preview-label']}>Preview</span>
					<h2>{data.name}</h2>
					<p>
						Your deck page will use these colors for its banner,
						background and highlights.
					</p>
					<span className={styles['preview-badge']}>
						{data.deck.count} cards
					</span>
				</div>
			</section>
		</>
	);
}
