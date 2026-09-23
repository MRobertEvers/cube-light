import React, { useEffect, useRef, useState } from 'react';
import {
	defaultSubjectProtection,
	MAX_PROTECT_STROKE_POINTS,
	MAX_PROTECT_STROKES,
	type BannerProtection,
	type BannerProtectRect,
	type BannerProtectStroke,
	type BannerSubjectMask,
	BannerWorkCancelled
} from '../../../../../domain/appearance/banner-blend';
import { useAppDispatch } from '../../../../../redux/use-app-dispatch';
import { cancelSubjectMaskPreview, previewSubjectMask } from '../../../../../redux/appearance-settings/appearance-settings.thunks';
import styles from './subject-protection.module.css';

type Tool = 'rect' | 'foreground' | 'background';
type Props = {
	src: string;
	protection: BannerProtection | null;
	feather: number;
	disabled?: boolean;
	onChange: (protection: BannerProtection) => void;
};
type Preview = { key: string; mask: BannerSubjectMask; milliseconds: number };
type PreviewStatus = {
	running: boolean;
	message: string | null;
	fraction: number;
	error: string | null;
};

const TOOL_LABELS: Record<Tool, string> = {
	rect: 'Subject area',
	foreground: 'Keep brush',
	background: 'Blend brush'
};
function clamp01(n: number) {
	return Math.min(1, Math.max(0, n));
}
function round(n: number) {
	return Math.round(n * 10000) / 10000;
}

/**
 * Edits a protected-subject selection in normalized source-image coordinates. Nothing here
 * runs segmentation implicitly; the mask preview only runs when its button is pressed.
 */
export function SubjectProtection(props: Props) {
	const { src, protection, feather, disabled = false, onChange } = props;
	const dispatch = useAppDispatch();
	const overlay = useRef<HTMLCanvasElement>(null),
		maskCanvas = useRef<HTMLCanvasElement>(null);
	const [tool, setTool] = useState<Tool>(
		protection?.rect ? 'foreground' : 'rect'
	);
	const [brush, setBrush] = useState(0.02);
	const [draft, setDraft] = useState<{
		rect?: BannerProtectRect;
		stroke?: BannerProtectStroke;
		origin?: [number, number];
	} | null>(null);
	const [size, setSize] = useState({ width: 0, height: 0 });
	const [preview, setPreview] = useState<Preview | null>(null);
	const [status, setStatus] = useState<PreviewStatus>({
		running: false,
		message: null,
		fraction: 0,
		error: null
	});
	const current: BannerProtection = protection ?? {
		source: src,
		rect: null,
		strokes: []
	};
	const key = JSON.stringify({
		src,
		rect: current.rect,
		strokes: current.strokes,
		feather
	});
	const previewStale = !!preview && preview.key !== key;

	useEffect(
		() =>
			function () {
				return dispatch(cancelSubjectMaskPreview());
			},
		[dispatch]
	);

	// Resizing only redraws the overlay; it never recomputes the mask.
	useEffect(() => {
		const element = overlay.current?.parentElement;
		if (!element) return;
		const measuredElement = element;
		function measure() {
			return setSize({
				width: measuredElement.clientWidth,
				height: measuredElement.clientHeight
			});
		}
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(element);
		return function () {
			return observer.disconnect();
		};
	}, []);

	useEffect(() => {
		const canvas = overlay.current;
		if (!canvas || !size.width) return;
		const ratio = window.devicePixelRatio || 1;
		canvas.width = Math.round(size.width * ratio);
		canvas.height = Math.round(size.height * ratio);
		const context = canvas.getContext('2d');
		if (!context) return;
		context.setTransform(ratio, 0, 0, ratio, 0, 0);
		context.clearRect(0, 0, size.width, size.height);
		const rect = draft?.rect ?? current.rect;
		if (rect) {
			context.fillStyle = 'rgba(20, 16, 14, 0.35)';
			context.beginPath();
			context.rect(0, 0, size.width, size.height);
			context.rect(
				rect.x * size.width,
				rect.y * size.height,
				rect.width * size.width,
				rect.height * size.height
			);
			context.fill('evenodd');
			context.setLineDash([6, 4]);
			context.lineWidth = 2;
			context.strokeStyle = '#ffffff';
			context.strokeRect(
				rect.x * size.width,
				rect.y * size.height,
				rect.width * size.width,
				rect.height * size.height
			);
			context.setLineDash([]);
		}
		for (const stroke of draft?.stroke
			? current.strokes.concat([draft.stroke])
			: current.strokes) {
			context.strokeStyle =
				stroke.label === 'foreground'
					? 'rgba(38, 190, 92, 0.75)'
					: 'rgba(226, 52, 52, 0.75)';
			context.fillStyle = context.strokeStyle;
			context.lineWidth = Math.max(2, stroke.radius * 2 * size.width);
			context.lineCap = 'round';
			context.lineJoin = 'round';
			context.beginPath();
			for (let i = 0; i + 1 < stroke.points.length; i += 2) {
				const x = stroke.points[i] * size.width,
					y = stroke.points[i + 1] * size.height;
				if (i === 0) context.moveTo(x, y);
				else context.lineTo(x, y);
			}
			if (stroke.points.length === 2)
				context.lineTo(
					stroke.points[0] * size.width + 0.01,
					stroke.points[1] * size.height
				);
			context.stroke();
		}
	}, [size, draft, current.rect, current.strokes]);

	useEffect(() => {
		const canvas = maskCanvas.current;
		if (!canvas) return;
		const context = canvas.getContext('2d');
		if (!context) return;
		if (!preview) {
			context.clearRect(0, 0, canvas.width, canvas.height);
			return;
		}
		const { width, height, alpha } = preview.mask;
		canvas.width = width;
		canvas.height = height;
		const image = context.createImageData(width, height);
		for (let p = 0; p < width * height; p++) {
			const a = alpha[p],
				edge = a > 8 && a < 247;
			image.data[p * 4] = edge ? 255 : 18;
			image.data[p * 4 + 1] = edge ? 214 : 14;
			image.data[p * 4 + 2] = edge ? 10 : 12;
			image.data[p * 4 + 3] = edge ? 200 : Math.round((255 - a) * 0.7);
		}
		context.putImageData(image, 0, 0);
	}, [preview]);

	function point(event: React.PointerEvent): [number, number] {
		const bounds = event.currentTarget.getBoundingClientRect();
		return [
			round(clamp01((event.clientX - bounds.left) / bounds.width)),
			round(clamp01((event.clientY - bounds.top) / bounds.height))
		];
	}
	function commitRect(rect: BannerProtectRect) {
		if (rect.width < 0.02 || rect.height < 0.02) return;
		onChange({ source: src, rect, strokes: current.strokes });
	}

	async function runPreview() {
		const requestKey = key;
		setStatus({
			running: true,
			message: 'Starting…',
			fraction: 0,
			error: null
		});
		try {
			const result = await dispatch(previewSubjectMask(
				src,
				current,
				feather,
				(progress) =>
					setStatus((s) => ({
						running: s.running,
						message: progress.message,
						fraction: progress.fraction,
						error: s.error
					}))
			));
			setPreview({
				key: requestKey,
				mask: result,
				milliseconds: result.milliseconds
			});
			setStatus({
				running: false,
				message: `Mask preview ready (${(result.milliseconds / 1000).toFixed(1)} s).`,
				fraction: 1,
				error: null
			});
		} catch (error) {
			if (error instanceof BannerWorkCancelled) return;
			setStatus({
				running: false,
				message: null,
				fraction: 0,
				error:
					error instanceof Error
						? error.message
						: 'Unable to preview the subject mask.'
			});
		}
	}

	const strokesFull = current.strokes.length >= MAX_PROTECT_STROKES;
	return (
		<div className={styles.editor}>
			<div
				className={styles.toolbar}
				role="radiogroup"
				aria-label="Subject selection tool"
			>
				{(['rect', 'foreground', 'background'] as const).map(
					(value) => (
						<label
							key={value}
							className={`${styles.tool} ${tool === value ? styles.active : ''}`}
						>
							<input
								type="radio"
								name="subject-tool"
								value={value}
								checked={tool === value}
								onChange={() => setTool(value)}
								disabled={disabled}
							/>
							<span
								className={`${styles.swatch} ${styles[value]}`}
								aria-hidden="true"
							/>
							{TOOL_LABELS[value]}
						</label>
					)
				)}
			</div>
			<p className={styles.hint}>
				{tool === 'rect'
					? 'Drag a rough box around the character or object to keep.'
					: tool === 'foreground'
						? 'Paint over parts of the subject that were missed.'
						: 'Paint over background that was wrongly kept.'}
			</p>
			<div
				className={`${styles.stage}${disabled ? ` ${styles.disabled}` : ''}`}
			>
				<img
					src={src}
					alt="Banner artwork for subject selection"
					draggable={false}
				/>
				<canvas
					ref={maskCanvas}
					className={`${styles.mask}${previewStale ? ` ${styles.stale}` : ''}`}
					aria-hidden="true"
				/>
				<canvas
					ref={overlay}
					className={styles.overlay}
					aria-label={`Subject selection canvas. Current tool: ${TOOL_LABELS[tool]}`}
					onPointerDown={
						disabled
							? undefined
							: function (event) {
									const [x, y] = point(event);
									event.currentTarget.setPointerCapture(
										event.pointerId
									);
									if (tool === 'rect')
										setDraft({
											origin: [x, y],
											rect: { x, y, width: 0, height: 0 }
										});
									else if (!strokesFull)
										setDraft({
											stroke: {
												label: tool,
												radius: brush,
												points: [x, y]
											}
										});
								}
					}
					onPointerMove={(event) => {
						if (!draft) return;
						const [x, y] = point(event);
						if (draft.origin) {
							const [ox, oy] = draft.origin;
							setDraft({
								stroke: draft.stroke,
								origin: draft.origin,
								rect: {
									x: Math.min(ox, x),
									y: Math.min(oy, y),
									width: round(Math.abs(x - ox)),
									height: round(Math.abs(y - oy))
								}
							});
						} else if (draft.stroke) {
							const points = draft.stroke.points,
								lx = points[points.length - 2],
								ly = points[points.length - 1];
							if (
								points.length / 2 >=
									MAX_PROTECT_STROKE_POINTS ||
								Math.hypot(x - lx, y - ly) < brush * 0.35
							)
								return;
							setDraft({
								stroke: {
									label: draft.stroke.label,
									radius: draft.stroke.radius,
									points: points.concat([x, y])
								}
							});
						}
					}}
					onPointerUp={() => {
						if (draft?.rect && draft.origin) commitRect(draft.rect);
						else if (draft?.stroke)
							onChange({
								source: src,
								rect: current.rect,
								strokes: current.strokes.concat([draft.stroke])
							});
						setDraft(null);
					}}
					onPointerCancel={() => setDraft(null)}
				/>
			</div>
			{tool !== 'rect' && (
				<label className={styles.range}>
					Brush size
					<input
						type="range"
						min="0.005"
						max="0.06"
						step="0.005"
						value={brush}
						onChange={(event) =>
							setBrush(Number(event.target.value))
						}
						disabled={disabled}
					/>
				</label>
			)}
			{strokesFull && (
				<p className={styles.hint} role="status">
					The correction limit is reached. Undo or clear marks to add
					more.
				</p>
			)}
			<div className={styles.buttons}>
				<button
					type="button"
					onClick={() =>
						onChange({
							source: src,
							rect: current.rect,
							strokes: current.strokes.slice(0, -1)
						})
					}
					disabled={disabled || !current.strokes.length}
				>
					Undo last mark
				</button>
				<button
					type="button"
					onClick={() =>
						onChange({
							source: src,
							rect: current.rect,
							strokes: []
						})
					}
					disabled={disabled || !current.strokes.length}
				>
					Clear marks
				</button>
				<button
					type="button"
					onClick={() => {
						setPreview(null);
						setTool('rect');
						onChange(defaultSubjectProtection(src));
					}}
					disabled={disabled}
				>
					Reset selection
				</button>
				<button
					type="button"
					className={styles.previewButton}
					onClick={() => void runPreview()}
					disabled={
						disabled ||
						status.running ||
						(!current.rect &&
							!current.strokes.some(
								(s) => s.label === 'foreground'
							))
					}
				>
					{status.running ? 'Previewing…' : 'Preview subject mask'}
				</button>
			</div>
			{status.running && (
				<progress
					className={styles.progress}
					value={status.fraction}
					max={1}
					aria-label="Mask preview progress"
				/>
			)}
			{status.message && (
				<p className={styles.hint} role="status">
					{status.message}
					{previewStale
						? ' The selection changed; preview again to see the update.'
						: ''}
				</p>
			)}
			{status.error && (
				<p className={styles.error} role="alert">
					{status.error}
				</p>
			)}
		</div>
	);
}
