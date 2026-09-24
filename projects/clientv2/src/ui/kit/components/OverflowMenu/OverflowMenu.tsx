import React, {
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState
} from 'react';
import { createPortal } from 'react-dom';

import { useHotkey, useHotkeyLayer } from '../../hotkeys/Hotkeys';
import styles from './overflow-menu.module.css';

type OverflowMenuProps = React.PropsWithChildren<{
	label: string;
	disabled?: boolean;
	icon?: React.ReactNode;
	triggerClassName?: string;
}>;

const VIEWPORT_GUTTER = 8;
const POPOVER_GAP = 4;

function MoreIcon() {
	return (
		<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
			<circle cx="12" cy="5" r="1.8" />
			<circle cx="12" cy="12" r="1.8" />
			<circle cx="12" cy="19" r="1.8" />
		</svg>
	);
}

function clamp(value: number, minimum: number, maximum: number) {
	return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

/**
 * A three-dot action menu that renders in the top layer and keeps its panel inside
 * the visual viewport. The panel prefers to open below the trigger and flips above
 * it when there is more room there.
 */
export function OverflowMenu(props: OverflowMenuProps) {
	const {
		label,
		disabled = false,
		icon = <MoreIcon />,
		triggerClassName,
		children
	} = props;
	const [open, setOpen] = useState(false);
	const menuId = useId();
	const root = useRef<HTMLDivElement>(null);
	const trigger = useRef<HTMLButtonElement>(null);
	const panel = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		function onPointerDown(event: PointerEvent) {
			const target = event.target as Node;
			if (
				!root.current?.contains(target) &&
				!panel.current?.contains(target)
			)
				setOpen(false);
		}
		window.addEventListener('pointerdown', onPointerDown);
		return function () {
			window.removeEventListener('pointerdown', onPointerDown);
		};
	}, [open]);
	const layer = useHotkeyLayer('menu', { elementRef: panel, enabled: open });
	useHotkey(
		'Escape',
		() => {
			setOpen(false);
			trigger.current?.focus();
		},
		{ layer, enabled: open }
	);

	useEffect(() => {
		if (disabled) setOpen(false);
	}, [disabled]);

	useLayoutEffect(() => {
		if (!open) return;
		const anchor = trigger.current;
		const popover = panel.current;
		if (!anchor || !popover) return;
		const anchorElement = anchor;
		const popoverElement = popover;
		let frame = 0;

		function positionPopover() {
			frame = 0;
			const anchorBounds = anchorElement.getBoundingClientRect();
			const popoverBounds = popoverElement.getBoundingClientRect();
			const viewport = window.visualViewport;
			const viewportLeft = viewport?.offsetLeft ?? 0;
			const viewportTop = viewport?.offsetTop ?? 0;
			const viewportWidth = viewport?.width ?? window.innerWidth;
			const viewportHeight = viewport?.height ?? window.innerHeight;
			const viewportRight = viewportLeft + viewportWidth;
			const viewportBottom = viewportTop + viewportHeight;
			const maxWidth = Math.max(0, viewportWidth - VIEWPORT_GUTTER * 2);
			const maxHeight = Math.max(0, viewportHeight - VIEWPORT_GUTTER * 2);
			const popoverWidth = Math.min(popoverBounds.width, maxWidth);
			const popoverHeight = Math.min(popoverBounds.height, maxHeight);
			const roomBelow =
				viewportBottom - anchorBounds.bottom - POPOVER_GAP;
			const roomAbove = anchorBounds.top - viewportTop - POPOVER_GAP;
			const above = popoverHeight > roomBelow && roomAbove > roomBelow;
			const preferredTop = above
				? anchorBounds.top - POPOVER_GAP - popoverHeight
				: anchorBounds.bottom + POPOVER_GAP;

			popoverElement.style.left = `${clamp(
				anchorBounds.right - popoverWidth,
				viewportLeft + VIEWPORT_GUTTER,
				viewportRight - VIEWPORT_GUTTER - popoverWidth
			)}px`;
			popoverElement.style.top = `${clamp(
				preferredTop,
				viewportTop + VIEWPORT_GUTTER,
				viewportBottom - VIEWPORT_GUTTER - popoverHeight
			)}px`;
			popoverElement.style.minWidth = `${Math.min(148, maxWidth)}px`;
			popoverElement.style.maxWidth = `${maxWidth}px`;
			popoverElement.style.maxHeight = `${maxHeight}px`;
			popoverElement.style.visibility = 'visible';
			popoverElement.dataset.placement = above ? 'top' : 'bottom';
		}

		function schedulePosition() {
			if (!frame) frame = requestAnimationFrame(positionPopover);
		}

		positionPopover();
		const observer = new ResizeObserver(schedulePosition);
		observer.observe(anchorElement);
		observer.observe(popoverElement);
		window.addEventListener('resize', schedulePosition);
		window.addEventListener('scroll', schedulePosition, true);
		window.visualViewport?.addEventListener('resize', schedulePosition);
		window.visualViewport?.addEventListener('scroll', schedulePosition);
		return function () {
			cancelAnimationFrame(frame);
			observer.disconnect();
			window.removeEventListener('resize', schedulePosition);
			window.removeEventListener('scroll', schedulePosition, true);
			window.visualViewport?.removeEventListener(
				'resize',
				schedulePosition
			);
			window.visualViewport?.removeEventListener(
				'scroll',
				schedulePosition
			);
		};
	}, [open]);

	return (
		<div ref={root} className={styles.root}>
			<button
				ref={trigger}
				type="button"
				className={triggerClassName ?? styles.trigger}
				aria-label={label}
				aria-expanded={open}
				aria-controls={open ? menuId : undefined}
				disabled={disabled}
				onClick={() => setOpen((current) => !current)}
			>
				{icon}
			</button>
			{open &&
				createPortal(
					<div
						ref={panel}
						id={menuId}
						className={styles.panel}
						onClick={() => setOpen(false)}
					>
						{children}
					</div>,
					document.body
				)}
		</div>
	);
}
