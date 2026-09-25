import React, { useState } from 'react';
import { Button } from '../Button/Button';
import { SmallInputModal } from '../SmallInputModal/SmallInputModal';
import { Spinner } from '../Spinner/Spinner';

import styles from './confirm-dialog.module.css';

type ConfirmDialogProps = React.PropsWithChildren<{
	title: string;
	/** The confirm button's text, e.g. "Delete location". */
	confirmLabel: string;
	/** Shown on the confirm button while `onConfirm` runs. */
	busyLabel: string;
	/** A destructive action gets the danger button. */
	danger?: boolean;
	/** Kept short: what goes wrong, and what to do. */
	failure: string;
	onConfirm: () => Promise<void>;
	onCancel: () => void;
}>;

/** Asks once, in the page, before doing something that cannot be taken back. */
export function ConfirmDialog(props: ConfirmDialogProps) {
	const { title, confirmLabel, busyLabel, danger, failure, onConfirm, onCancel, children } = props;
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function confirm() {
		if (busy) return;
		setBusy(true);
		setError(null);
		try {
			await onConfirm();
		} catch {
			setError(failure);
			setBusy(false);
		}
	}

	return (
		<SmallInputModal
			title={title}
			onClose={onCancel}
			closeDisabled={busy}
			onSubmit={() => void confirm()}
			busy={busy}
			actions={
				<>
					<Button onClick={onCancel} disabled={busy}>
						Keep
					</Button>
					<Button type="submit" variant={danger ? 'danger' : 'primary'} disabled={busy}>
						{busy ? (
							<>
								<Spinner /> {busyLabel}
							</>
						) : (
							confirmLabel
						)}
					</Button>
				</>
			}
		>
			<div className={styles.body}>{children}</div>
			{error && (
				<p className={styles.error} role="alert">
					{error}
				</p>
			)}
		</SmallInputModal>
	);
}
