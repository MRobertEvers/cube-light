import React, { useEffect, useMemo, useState } from 'react';
import {
	CardPrinting,
	fetchAPICardPrintings
} from '../../../../api/fetch-api-card-printings';
import { FetchAPIDeckCardResponse } from '../../../../api/fetch-api-deck';
import { Button } from '../../../../components/Button/Button';
import { Counter } from '../../../../components/Counter/Counter';
import { PrintingPicker } from '../../../../components/PrintingPicker/PrintingPicker';

import styles from './edit-card.module.css';

export type EditCardUpdate = {
	uuid: string;
	count: number;
};

export type EditCardModalProps = {
	card: FetchAPIDeckCardResponse | null;
	editable: boolean;
	onSubmit: (update: EditCardUpdate) => Promise<void>;
	onCancel: () => void;
};

export function EditCardModal(props: EditCardModalProps) {
	const { card, editable, onSubmit, onCancel } = props;
	const [count, setCount] = useState(1);
	const [printings, setPrintings] = useState<CardPrinting[]>([]);
	const [selectedUuid, setSelectedUuid] = useState('');
	const [loadingPrintings, setLoadingPrintings] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!card) return;
		setCount(card.count);
		setSelectedUuid(card.uuid);
		setPrintings([]);
		setLoadError(null);
		setSaveError(null);
		setLoadingPrintings(false);
		if (!editable) return;

		const controller = new AbortController();
		setLoadingPrintings(true);
		void fetchAPICardPrintings(card.name, controller.signal)
			.then((items) => setPrintings(items.filter((item) => !!item.image)))
			.catch((error: unknown) => {
				if (!(
					error instanceof DOMException && error.name === 'AbortError'
				)) {
					setLoadError(
						'Print versions could not be loaded. You can still update the number of copies.'
					);
				}
			})
			.finally(() => {
				if (!controller.signal.aborted) setLoadingPrintings(false);
			});
		return () => controller.abort();
	}, [card, editable]);

	useEffect(() => {
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && !saving) onCancel();
		};
		window.addEventListener('keydown', closeOnEscape);
		return () => window.removeEventListener('keydown', closeOnEscape);
	}, [onCancel, saving]);

	const selectedPrinting = useMemo(
		() => printings.find((printing) => printing.uuid === selectedUuid),
		[printings, selectedUuid]
	);

	if (!card) return null;

	const selectedImage =
		selectedPrinting?.image ?? card.images?.normal ?? card.image;
	const selectedSetCode = selectedPrinting?.setCode ?? card.setCode;
	const save = async () => {
		if (saving || count < 1) return;
		setSaving(true);
		setSaveError(null);
		try {
			await onSubmit({ uuid: selectedUuid || card.uuid, count });
		} catch {
			setSaveError('Unable to save this card. Please try again.');
			setSaving(false);
		}
	};

	return (
		<section
			className={`${styles['container']} ${!editable ? styles['view-only'] : ''}`}
			role="dialog"
			aria-modal="true"
			aria-labelledby="card-modal-title"
		>
			<header className={styles['header']}>
				<div>
					<h2 id="card-modal-title">{card.name}</h2>
					<p>{selectedSetCode} printing</p>
				</div>
				<div className={styles['header-actions']}>
					{editable && (
						<Button
							className={styles['save']}
							onClick={() => {
								void save();
							}}
							disabled={saving || count < 1}
						>
							{saving ? 'Saving…' : 'Save card'}
						</Button>
					)}
					<button
						className={styles['close']}
						type="button"
						aria-label="Close card preview"
						onClick={onCancel}
						disabled={saving}
					>
						×
					</button>
				</div>
				{saveError && (
					<p className={styles['save-error']} role="alert">
						{saveError}
					</p>
				)}
			</header>
			<div className={styles['body']}>
				<div className={styles['image-panel']}>
					<img
						src={selectedImage}
						alt={`${card.name}, ${selectedSetCode} printing`}
					/>
				</div>
				{editable && (
					<div className={styles['controls']}>
						<div className={styles['printing-heading']}>
							<h3 id="printing-heading">Print version</h3>
							{loadingPrintings && (
								<span role="status">Loading…</span>
							)}
						</div>
						{loadError && (
							<p className={styles['message']} role="alert">
								{loadError}
							</p>
						)}
						<PrintingPicker
							printings={printings}
							selectedUuid={selectedUuid}
							onSelect={setSelectedUuid}
							name="card-printing"
							image="card"
							disabled={saving}
							aria-labelledby="printing-heading"
						/>
						<div className={styles['count-row']}>
							<div>
								<h3>Copies</h3>
								<p>In this deck</p>
							</div>
							<Counter
								count={count}
								setCount={(next) => setCount(Math.max(1, next))}
							/>
						</div>
					</div>
				)}
			</div>
		</section>
	);
}
