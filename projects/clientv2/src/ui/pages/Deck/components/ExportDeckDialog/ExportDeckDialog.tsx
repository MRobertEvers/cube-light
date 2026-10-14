import React, { useMemo, useRef, useState } from 'react';
import { Button } from 'src/ui/kit/components/Button/Button';
import { SmallInputModal } from 'src/ui/kit/components/SmallInputModal/SmallInputModal';
import { deckListText } from 'src/domain/deck/deck-list-text';
import type { DeckDetail } from 'src/domain/models/deck';

import styles from './export-deck-dialog.module.css';

type ExportDeckDialogProps = {
	deck: Pick<DeckDetail, 'name' | 'cards' | 'sideboard'>;
	onClose: () => void;
};

/** A file name made from the deck's name, safe on every system. */
function fileNameOf(deckName: string): string {
	const base = deckName.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
	return `${base || 'deck'}.txt`;
}

/** Whether this browser can open the system share sheet (most phones, Safari, and Chrome or Edge on desktop). */
function canShare(): boolean {
	return typeof navigator.share === 'function';
}

/** The deck as a text list, to copy, download or share to another site or app. */
export function ExportDeckDialog(props: ExportDeckDialogProps) {
	const { deck, onClose } = props;
	const text = useMemo(() => deckListText(deck), [deck]);
	const textRef = useRef<HTMLTextAreaElement>(null);
	const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
	const [shareFailed, setShareFailed] = useState(false);

	async function copy() {
		try {
			await navigator.clipboard.writeText(text);
			setCopyState('copied');
		} catch {
			// The clipboard is unavailable on insecure origins; leave the text selected to copy by hand.
			textRef.current?.select();
			setCopyState('failed');
		}
	}

	function download() {
		const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
		const link = document.createElement('a');
		link.href = url;
		link.download = fileNameOf(deck.name);
		link.click();
		URL.revokeObjectURL(url);
	}

	/** Where the share sheet is missing, a new email in the default mail app carries the list instead. */
	function email() {
		const subject = encodeURIComponent(deck.name);
		// Mail clients expect CRLF line breaks in a mailto body.
		const body = encodeURIComponent(text.replace(/\r?\n/g, '\r\n'));
		window.location.href = `mailto:?subject=${subject}&body=${body}`;
	}

	async function share() {
		setShareFailed(false);
		try {
			await navigator.share({ title: deck.name, text });
		} catch (error) {
			// Dismissing the share sheet rejects too; only a real failure is worth a word.
			if (!(error instanceof DOMException && error.name === 'AbortError')) setShareFailed(true);
		}
	}

	return (
		<SmallInputModal
			title="Export"
			onClose={onClose}
			closeLabel="Close"
			actions={
				<>
					<Button onClick={download}>Download</Button>
					{canShare() ? (
						<Button onClick={() => void share()}>Share</Button>
					) : (
						<Button onClick={email}>Email</Button>
					)}
					<Button variant="primary" onClick={() => void copy()}>
						{copyState === 'copied' ? 'Copied' : 'Copy'}
					</Button>
				</>
			}
		>
			<p className={styles.intro}>Paste this list into Arena, Moxfield, CubeCobra or another deck.</p>
			<textarea
				ref={textRef}
				className={styles.list}
				value={text}
				readOnly
				rows={12}
				spellCheck={false}
				aria-label="Deck list"
				onFocus={(event) => event.currentTarget.select()}
			/>
			{copyState === 'failed' && (
				<p className={styles.error} role="alert">
					Unable to copy here. The list is selected; copy it from your keyboard or menu.
				</p>
			)}
			{shareFailed && (
				<p className={styles.error} role="alert">
					Unable to share here. Copy or download the list instead.
				</p>
			)}
		</SmallInputModal>
	);
}
