import React from 'react';
import { useIsPhoneLayout } from 'src/ui/kit/hooks/useIsPhoneLayout';
import { SmallInputModalDesktop } from './SmallInputModalDesktop';
import { SmallInputModalMobile } from './SmallInputModalMobile';

export type SmallInputModalProps = React.PropsWithChildren<{
	title: React.ReactNode;
	onClose: () => void;
	/** Blocks Escape and the close button, e.g. while saving. */
	closeDisabled?: boolean;
	/** Off when the content handles Escape itself (say, to close a dropdown first). */
	closeOnEscape?: boolean;
	/** Shows a × in the header with this label. */
	closeLabel?: string;
	/** Buttons along the bottom; on phones they stay visible above the keyboard. */
	actions?: React.ReactNode;
	/** Makes the dialog a form, so Enter in a field submits it. */
	onSubmit?: () => void;
	onKeyDown?: React.KeyboardEventHandler<HTMLElement>;
	surfaceRef?: React.RefObject<HTMLElement | null>;
	busy?: boolean;
}>;

/**
 * A short dialog around a few fields: a centered card on desktop and a
 * bottom sheet on phones that sits on top of the keyboard.
 */
export function SmallInputModal(props: SmallInputModalProps) {
	const {
		title,
		onClose,
		closeDisabled,
		closeOnEscape,
		closeLabel,
		actions,
		onSubmit,
		onKeyDown,
		surfaceRef,
		busy,
		children
	} = props;
	const isPhoneLayout = useIsPhoneLayout();
	return isPhoneLayout ? (
		<SmallInputModalMobile
			title={title}
			onClose={onClose}
			closeDisabled={closeDisabled}
			closeOnEscape={closeOnEscape}
			closeLabel={closeLabel}
			actions={actions}
			onSubmit={onSubmit}
			onKeyDown={onKeyDown}
			surfaceRef={surfaceRef}
			busy={busy}
		>
			{children}
		</SmallInputModalMobile>
	) : (
		<SmallInputModalDesktop
			title={title}
			onClose={onClose}
			closeDisabled={closeDisabled}
			closeOnEscape={closeOnEscape}
			closeLabel={closeLabel}
			actions={actions}
			onSubmit={onSubmit}
			onKeyDown={onKeyDown}
			surfaceRef={surfaceRef}
			busy={busy}
		>
			{children}
		</SmallInputModalDesktop>
	);
}
