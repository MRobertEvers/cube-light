import React, { useMemo, useState } from 'react';
import { Button } from 'src/ui/kit/components/Button/Button';
import { SmallInputModal } from 'src/ui/kit/components/SmallInputModal/SmallInputModal';
import { Spinner } from 'src/ui/kit/components/Spinner/Spinner';
import { parseCardList } from 'src/domain/card-names/parse-card-list';
import { importCollectionList } from 'src/redux/library/library.thunks';
import { errorMessage } from 'src/redux/thunk';
import { useAppDispatch } from 'src/redux/use-app-dispatch';

import styles from './collection-dialogs.module.css';

type PasteToCollectionDialogProps = {
	collectionId: string;
	collectionName: string;
	onClose: () => void;
};

/** Adds a pasted card list to a collection. Board headings are ignored: a collection has one list. */
export function PasteToCollectionDialog(props: PasteToCollectionDialogProps) {
	const { collectionId, collectionName, onClose } = props;
	const dispatch = useAppDispatch();
	const [text, setText] = useState('');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const parsed = useMemo(() => parseCardList(text, 'main'), [text]);
	const total = parsed.cards.reduce((sum, card) => sum + card.count, 0);

	async function add() {
		if (!parsed.cards.length || saving) return;
		setSaving(true);
		setError(null);
		try {
			await dispatch(importCollectionList(collectionId, parsed.cards.map((card) => (card.setCode ? { name: card.name, count: card.count, setCode: card.setCode } : { name: card.name, count: card.count }))));
			onClose();
		} catch (importError) {
			setError(errorMessage(importError, 'Unable to add the list. Check the card names and try again; nothing was added.'));
			setSaving(false);
		}
	}

	return (
		<SmallInputModal
			title={`Paste a list into ${collectionName}`}
			onClose={onClose}
			closeDisabled={saving}
			busy={saving}
			actions={
				<>
					<Button onClick={onClose} disabled={saving}>
						Cancel
					</Button>
					<Button variant="primary" disabled={!parsed.cards.length || saving} onClick={() => void add()}>
						{saving ? (
							<>
								<Spinner /> Adding…
							</>
						) : (
							`Add ${total} ${total === 1 ? 'card' : 'cards'}`
						)}
					</Button>
				</>
			}
		>
			<div className={styles.field}>
				<label htmlFor="collection-paste">One card per line</label>
				<textarea
					id="collection-paste"
					className={styles.textarea}
					autoFocus
					rows={10}
					value={text}
					disabled={saving}
					placeholder={'4 Lightning Bolt\n2 Counterspell (MH2)\n1 Sol Ring'}
					onChange={(event) => setText(event.target.value)}
				/>
				<p className={styles.hint}>
					{parsed.cards.length
						? `${total} ${total === 1 ? 'copy' : 'copies'} of ${parsed.cards.length} ${parsed.cards.length === 1 ? 'card' : 'cards'} ready to add.`
						: 'A count, the card name, and optionally its set in parentheses.'}
					{parsed.errors.length > 0 && ` ${parsed.errors.length} ${parsed.errors.length === 1 ? 'line is' : 'lines are'} not understood and will be skipped.`}
				</p>
			</div>
			{error && (
				<p className={styles.error} role="alert">
					{error}
				</p>
			)}
		</SmallInputModal>
	);
}
