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

/** The deck as a text list, to copy or download for another site or app. */
export function ExportDeckDialog(props: ExportDeckDialogProps) {
	const { deck, onClose } = props;
	const text = useMemo(() => deckListText(deck), [deck]);
	const textRef = useRef<HTMLTextAreaElement>(null);
	const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

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

	return (
		<SmallInputModal
			title="Export"
			onClose={onClose}
			actions={
				<>
					<Button onClick={onClose}>Close</Button>
					<Button onClick={download}>Download</Button>
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
		</SmallInputModal>
	);
}
