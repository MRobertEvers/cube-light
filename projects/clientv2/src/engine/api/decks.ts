import { normalizeTags, type CardEdit, type DomainCommand } from '@torimtg/core';
import type { ToriMTG } from '../core/types';
import type { LocalReader } from '../core/local-reader';
import { newId } from '../../domain/ids';
import type { CardPalette } from '../../domain/appearance/card-palette';
import type { BannerCrop } from '../../domain/appearance/banner-crop';
import type { DeckTopStyle } from '../../domain/appearance/deck-top-style';
import type {
	BannerBlendConfig,
	BannerBlendVariant
} from '../../domain/appearance/banner-blend';
import {
	applySteps,
	countEdits,
	countsIn,
	printingCounts,
	type DeckCardStep
} from '../../domain/deck/card-steps';
import { boardOf, cardEdit, type CardApi } from './cards';
import type { Versioned } from './versioned';
import type {
	DeckBoard,
	DeckCardsMove,
	DeckHistory,
	DeckDetail,
	DeckSummaries,
	ImportedCard
} from '../../domain/models/deck';

/** A generated banner: its inputs, and each variant's PNG as base64. */
export type GeneratedBannerBlend = {
	source: string;
	crop: BannerCrop;
	config: BannerBlendConfig;
	images: Record<BannerBlendVariant, string>;
};

/** Reads and edits decks. Every edit is saved on this device first; ToriMTG syncs it. */
export class DeckApi {
	private readonly tori: ToriMTG;
	private readonly reader: LocalReader;
	private readonly cards: CardApi;
	/** Each deck's card steps commit one after another, in the order they were taken. */
	private readonly stepQueues = new Map<string, Promise<unknown>>();

	constructor(tori: ToriMTG, reader: LocalReader, cards: CardApi) {
		this.tori = tori;
		this.reader = reader;
		this.cards = cards;
	}

	/** Every deck; waits for the first download when nothing is on this device yet. */
	async list(): Promise<Versioned<DeckSummaries>> {
		const snapshot = await this.reader.available<DeckSummaries>({ type: 'decks' });
		return { value: snapshot.data || [], revision: snapshot.localRevision };
	}

	/** The decks saved on this device, without waiting for the server. Null before the first download. */
	async listLocal(): Promise<Versioned<DeckSummaries> | null> {
		const snapshot = await this.tori.queries.read<DeckSummaries>({ type: 'decks' });
		return snapshot.presence === 'missing' ? null : { value: snapshot.data!, revision: snapshot.localRevision };
	}

	/** One deck; waits for a download when it is not on this device yet. */
	async get(deckId: string): Promise<Versioned<DeckDetail>> {
		const snapshot = await this.reader.available<DeckDetail>({ type: 'deck', id: deckId });
		if (!snapshot.data) throw new Error('This deck was deleted or is not downloaded.');
		return { value: snapshot.data, revision: snapshot.localRevision };
	}

	/** One deck as saved on this device, without waiting. `deleted` once the deck is gone for good. */
	async getLocal(deckId: string): Promise<{ deck: DeckDetail | null; deleted: boolean; revision: number }> {
		const snapshot = await this.tori.queries.read<DeckDetail>({ type: 'deck', id: deckId });
		return { deck: snapshot.data, deleted: !snapshot.data && snapshot.presence === 'complete', revision: snapshot.localRevision };
	}

	/** Every saved edit to the deck, newest first. */
	history(deckId: string): Promise<DeckHistory> {
		return this.reader.value<DeckHistory>({ type: 'history', id: deckId });
	}

	/** Returns the new deck's id. */
	async create(name: string): Promise<string> {
		const deckId = newId('deck');
		await this.tori.commands.execute({ type: 'deck.create', id: deckId, name });
		return deckId;
	}

	async delete(deckId: string): Promise<void> {
		await this.tori.commands.execute({ type: 'deck.delete', id: deckId });
	}

	async rename(deckId: string, name: string): Promise<void> {
		await this.tori.commands.execute({ type: 'deck.details', id: deckId, name });
	}

	/** Shows this printing's artwork in the deck's banner. */
	async setBannerCard(deckId: string, cardUuid: string): Promise<void> {
		const [{ value: deck }, { art }] = await Promise.all([this.get(deckId), this.cards.details(cardUuid)]);
		const command: Extract<DomainCommand, { type: 'deck.details' }> = {
			type: 'deck.details',
			id: deckId,
			name: deck.name,
			bannerCardUuid: cardUuid
		};
		if (art) command.art = art;
		await this.tori.commands.execute(command);
	}

	async setPalette(deckId: string, palette: CardPalette | null): Promise<void> {
		await this.tori.commands.execute({ type: 'deck.palette', id: deckId, palette });
	}

	async setBannerCrop(deckId: string, crop: BannerCrop): Promise<void> {
		await this.tori.commands.execute({ type: 'deck.crop', id: deckId, crop });
	}

	async setTopStyle(deckId: string, topStyle: DeckTopStyle): Promise<void> {
		await this.tori.commands.execute({ type: 'deck.style', id: deckId, topStyle });
	}

	async setBoardVisualization(
		deckId: string,
		boardVisualization: string
	): Promise<void> {
		await this.tori.commands.execute({
			type: 'deck.visualization',
			id: deckId,
			boardVisualization
		});
	}

	/** Saves each generated banner image as a local blob, then the blend that uses them. */
	async saveBannerBlend(
		deckId: string,
		blend: GeneratedBannerBlend
	): Promise<void> {
		const images = {} as Record<BannerBlendVariant, string>;
		for (const variant of ['desktop', 'mobile', 'tile'] as const) {
			const bytes = Uint8Array.from(atob(blend.images[variant]), (character) =>
				character.charCodeAt(0)
			);
			images[variant] = await this.tori.saveBlob(
				new Blob([bytes], { type: 'image/png' })
			);
		}
		await this.tori.commands.execute({
			type: 'deck.blend',
			id: deckId,
			blend: {
				source: blend.source,
				crop: blend.crop,
				config: blend.config,
				images
			}
		});
	}

	/** Replaces the deck's tags. Blank and repeated tags are dropped. */
	async setTags(deckId: string, tags: string[]): Promise<void> {
		await this.tori.commands.execute({ type: 'deck.tags', id: deckId, tags: normalizeTags(tags) });
	}

	/** Returns the new note's id. */
	async addNote(deckId: string, text: string): Promise<string> {
		const noteId = newId('note');
		await this.tori.commands.execute({ type: 'deck.note', id: deckId, noteId, text });
		return noteId;
	}

	async editNote(deckId: string, noteId: string, text: string): Promise<void> {
		await this.tori.commands.execute({ type: 'deck.note', id: deckId, noteId, text });
	}

	async removeNote(deckId: string, noteId: string): Promise<void> {
		await this.tori.commands.execute({ type: 'deck.noteDelete', id: deckId, noteId });
	}

	/** Adds copies of a named card to each board in `counts`, as one edit. */
	async addCardByName(
		deckId: string,
		cardName: string,
		counts: Partial<Record<DeckBoard, number>>
	): Promise<void> {
		const { uuid } = await this.cards.resolve(cardName);
		const edits: CardEdit[] = Object.entries(counts)
			.filter((entry) => entry[1] > 0)
			.map((entry) => cardEdit(uuid, 'add', entry[1], entry[0]));
		await this.tori.commands.execute({ type: 'deck.cards', id: deckId, edits });
	}

	/** Takes these printings out of one board entirely, as one edit. */
	async removeCards(deckId: string, board: DeckBoard, printings: string[]): Promise<void> {
		await this.tori.commands.execute({
			type: 'deck.cards',
			id: deckId,
			edits: printings.map((uuid) => cardEdit(uuid, 'set', 0, board))
		});
	}

	/** Moves copies between two boards as one edit, so neither board is ever saved alone. */
	async moveCards(deckId: string, move: DeckCardsMove): Promise<void> {
		const from = boardOf(move.from);
		const to = boardOf(move.to);
		if ((from.board || 'main') === (to.board || 'main')) return;
		// Never move more copies than the source board holds, or the move would create cards.
		const { value: deck } = await this.get(deckId);
		const held = new Map(
			((from.board === 'side' ? deck.sideboard : deck.cards) || []).map(
				(card) => [card.uuid, card.count]
			)
		);
		const edits = move.cards.flatMap((card) => {
			const count = Math.min(card.count, held.get(card.uuid) || 0);
			return count > 0
				? [
						cardEdit(card.uuid, 'remove', count, from.board),
						cardEdit(card.uuid, 'add', count, to.board)
					]
				: [];
		});
		await this.tori.commands.execute({ type: 'deck.cards', id: deckId, edits });
	}

	/** Adds every card in a pasted or scanned list, as one edit. */
	async importList(deckId: string, cards: ImportedCard[]): Promise<void> {
		await this.tori.commands.execute({
			type: 'deck.cards',
			id: deckId,
			edits: await this.cards.importEdits(cards)
		});
	}

	/**
	 * Saves card editor steps as soon as they are taken. Each resolves against the deck as
	 * committed locally, including every earlier step, so quick steps never undo each other.
	 * Returns the deck as saved, or null when the steps changed nothing.
	 */
	async applyCardSteps(
		deckId: string,
		steps: DeckCardStep[]
	): Promise<Versioned<DeckDetail> | null> {
		const previous = this.stepQueues.get(deckId) ?? Promise.resolve();
		const next = previous
			.catch(() => undefined)
			.then(() => this.commitCardSteps(deckId, steps));
		this.stepQueues.set(deckId, next);
		try {
			return await next;
		} finally {
			if (this.stepQueues.get(deckId) === next) this.stepQueues.delete(deckId);
		}
	}

	private async commitCardSteps(
		deckId: string,
		steps: DeckCardStep[]
	): Promise<Versioned<DeckDetail> | null> {
		const query = { type: 'deck' as const, id: deckId };
		const current = await this.tori.queries.read<DeckDetail>(query);
		if (!current.data)
			throw new Error('This deck was deleted or is not downloaded.');
		const before = printingCounts(
			current.data.cards.concat(current.data.sideboard ?? [])
		);
		const edits = countEdits(before, applySteps(before, steps));
		if (edits.length === 0) return null;
		// A printing new to the deck needs its details to be filed; download it first.
		for (const edit of edits) {
			const held = countsIn(before, edit.uuid);
			if (edit.count > 0 && held.main + held.side === 0)
				await this.cards.details(edit.uuid);
		}
		await this.tori.commands.execute({ type: 'deck.cards', id: deckId, edits });
		const saved = await this.tori.queries.read<DeckDetail>(query);
		return saved.data ? { value: saved.data, revision: saved.localRevision } : null;
	}
}
