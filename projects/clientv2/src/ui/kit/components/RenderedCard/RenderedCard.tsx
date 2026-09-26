import React, { type CSSProperties, useMemo, useRef, useState } from 'react';
import { type CardFrame, cardFrame } from '../../../../domain/models/card-frame';
import type { DeckColor } from '../../../../domain/deck/deck-colors';
import { ManaCost, ManaText } from '../ManaCost/ManaCost';
import { OfflineNote } from './OfflineNote';
import { SetSymbol } from './SetSymbol';
import { useShrinkToFit } from './use-shrink-to-fit';

import frameA from '../../../../assets/card-frames/frame-a.webp?url';
import frameB from '../../../../assets/card-frames/frame-b.webp?url';
import frameG from '../../../../assets/card-frames/frame-g.webp?url';
import frameL from '../../../../assets/card-frames/frame-l.webp?url';
import frameM from '../../../../assets/card-frames/frame-m.webp?url';
import frameR from '../../../../assets/card-frames/frame-r.webp?url';
import frameU from '../../../../assets/card-frames/frame-u.webp?url';
import frameV from '../../../../assets/card-frames/frame-v.webp?url';
import frameW from '../../../../assets/card-frames/frame-w.webp?url';
import maskPinline from '../../../../assets/card-frames/mask-pinline.webp?url';
import ptA from '../../../../assets/card-frames/pt-a.webp?url';
import ptB from '../../../../assets/card-frames/pt-b.webp?url';
import ptC from '../../../../assets/card-frames/pt-c.webp?url';
import ptG from '../../../../assets/card-frames/pt-g.webp?url';
import ptM from '../../../../assets/card-frames/pt-m.webp?url';
import ptR from '../../../../assets/card-frames/pt-r.webp?url';
import ptU from '../../../../assets/card-frames/pt-u.webp?url';
import ptW from '../../../../assets/card-frames/pt-w.webp?url';
import pwFrameA from '../../../../assets/card-frames/pw-frame-a.webp?url';
import pwFrameB from '../../../../assets/card-frames/pw-frame-b.webp?url';
import pwFrameG from '../../../../assets/card-frames/pw-frame-g.webp?url';
import pwFrameM from '../../../../assets/card-frames/pw-frame-m.webp?url';
import pwFrameR from '../../../../assets/card-frames/pw-frame-r.webp?url';
import pwFrameU from '../../../../assets/card-frames/pw-frame-u.webp?url';
import pwFrameW from '../../../../assets/card-frames/pw-frame-w.webp?url';

import styles from './rendered-card.module.css';

/** What a rendered card shows: one face's text, its printing's details and its art's URL. */
export type RenderedCardFace = {
	name: string;
	manaCost: string | null;
	type: string | null;
	text: string | null;
	flavorText: string | null;
	power: string | null;
	toughness: string | null;
	loyalty: string | null;
	defense: string | null;
	setCode: string | null;
	rarity: string | null;
	number: string | null;
	artist: string | null;
	/** The art crop's URL; null when the printing has none known here. */
	art: string | null;
};

/** A layer of frame image drawn over the card: all of it, or through a mask. */
type FrameLayer = { src: string; mask: string | null };

const FRAMES: Record<DeckColor, string> = { W: frameW, U: frameU, B: frameB, R: frameR, G: frameG };
const WALKER_FRAMES: Record<DeckColor, string> = { W: pwFrameW, U: pwFrameU, B: pwFrameB, R: pwFrameR, G: pwFrameG };
const PT_BOXES: Record<DeckColor, string> = { W: ptW, U: ptU, B: ptB, R: ptR, G: ptG };
// A two-color frame's second color, across the right side as printed hybrid cards blend.
const RIGHT_SIDE = 'linear-gradient(90deg, transparent 44%, #000 56%)';

/**
 * The M15 frame layers and power/toughness box for a frame, bottom first: one color, a
 * hybrid's two colors split left and right, gold, artifact (vehicles their own), and lands
 * on the land frame with pinlines in the colors of mana they make.
 */
function frameLayers(frame: CardFrame, type: string | null): { layers: FrameLayer[]; pt: string } {
	if (/\bPlaneswalker\b/.test(type ?? '')) return { layers: walkerLayers(frame), pt: ptC };
	if (frame.kind === 'mono') return { layers: [{ src: FRAMES[frame.color], mask: null }], pt: PT_BOXES[frame.color] };
	if (frame.kind === 'hybrid') {
		return {
			layers: [
				{ src: FRAMES[frame.colors[0]], mask: null },
				{ src: FRAMES[frame.colors[1]], mask: RIGHT_SIDE }
			],
			pt: PT_BOXES[frame.colors[1]]
		};
	}
	if (frame.kind === 'gold') return { layers: [{ src: frameM, mask: null }], pt: ptM };
	if (frame.kind === 'artifact') return { layers: [{ src: /\bVehicle\b/.test(type ?? '') ? frameV : frameA, mask: null }], pt: ptA };
	if (frame.kind === 'colorless') return { layers: [{ src: frameA, mask: null }], pt: ptC };
	const pinline = `url(${maskPinline})`;
	const land: FrameLayer = { src: frameL, mask: null };
	if (frame.colors.length === 1) return { layers: [land, { src: FRAMES[frame.colors[0]], mask: pinline }], pt: ptC };
	if (frame.colors.length === 2) {
		return {
			layers: [
				land,
				{ src: FRAMES[frame.colors[0]], mask: pinline },
				{ src: FRAMES[frame.colors[1]], mask: `${pinline}, ${RIGHT_SIDE}` }
			],
			pt: ptC
		};
	}
	if (frame.colors.length > 2) return { layers: [land, { src: frameM, mask: pinline }], pt: ptC };
	return { layers: [land], pt: ptC };
}

/** A planeswalker's frame layers: its own frame, open over the art down to the loyalty box. */
function walkerLayers(frame: CardFrame): FrameLayer[] {
	if (frame.kind === 'mono') return [{ src: WALKER_FRAMES[frame.color], mask: null }];
	if (frame.kind === 'hybrid') {
		return [
			{ src: WALKER_FRAMES[frame.colors[0]], mask: null },
			{ src: WALKER_FRAMES[frame.colors[1]], mask: RIGHT_SIDE }
		];
	}
	if (frame.kind === 'gold') return [{ src: pwFrameM, mask: null }];
	return [{ src: pwFrameA, mask: null }];
}

/** One line of a planeswalker's text: a loyalty ability and its cost, or a static ability (cost null). */
type WalkerAbility = { cost: string | null; kind: 'plus' | 'minus' | 'neutral'; text: string };

// "[+1]: …", "+1: …", "[−X]: …", "0: …": a loyalty cost opening a line.
const LOYALTY_COST = /^\[?([+\u2212-]\s?(?:\d+|X)|0)\]?:\s*/;

function walkerAbilities(text: string | null): WalkerAbility[] {
	return (text ?? '')
		.split('\n')
		.filter(Boolean)
		.map(function (line) {
			const match = LOYALTY_COST.exec(line);
			if (!match) return { cost: null, kind: 'neutral', text: line };
			const cost = match[1].replace(/\s/g, '').replace(/[\u2212-]/, '\u2013');
			const kind = cost.startsWith('+') ? 'plus' : cost === '0' ? 'neutral' : 'minus';
			return { cost: cost, kind: kind, text: line.slice(match[0].length) };
		});
}

/** A masked layer's style: every mask image must show for the layer to (mask-composite: intersect). */
function layerStyle(layer: FrameLayer): CSSProperties | undefined {
	if (!layer.mask) return undefined;
	return { maskImage: layer.mask, WebkitMaskImage: layer.mask, maskSize: '100% 100%', maskComposite: 'intersect', WebkitMaskComposite: 'source-in' } as CSSProperties;
}

/** Power and toughness, or loyalty, or defense; null for cards with none. */
function stats(face: RenderedCardFace): string | null {
	if (face.power != null && face.toughness != null) return `${face.power}/${face.toughness}`;
	return face.loyalty ?? face.defense;
}

/** Rules text as a card prints it: MPlantin has no minus sign (U+2212), so loyalty costs use a hyphen. */
function printedText(line: string): string {
	return line.replace(/\u2212/g, '-');
}

const RARITY_LETTERS: Record<string, string> = { common: 'C', uncommon: 'U', rare: 'R', mythic: 'M', special: 'S', bonus: 'B' };

/**
 * A card drawn from its text, for when its image cannot be shown: the M15 frame for its
 * colors (assets/card-frames) over its art, with its name, cost, type line, set symbol,
 * rules text, stats and collector lines in a printed card's fonts, sizes and places. The
 * frames, art and fonts come through ShellWorker like any asset, so it draws offline once
 * they are stored. Its art is softened and noted as an offline preview, since the pack holds
 * each card's default printing's art, not always the chosen printing's. A card that is itself
 * a button (the tabletop's) takes the note as a label, as a button cannot hold a button.
 */
export function RenderedCard(props: { face: RenderedCardFace; className?: string; note?: 'button' | 'label' }) {
	const { face, className, note } = props;
	const [failedArt, setFailedArt] = useState<string | null>(null);
	const name = useRef<HTMLSpanElement>(null);
	const type = useRef<HTMLSpanElement>(null);
	const box = useRef<HTMLDivElement>(null);
	const bands = useRef<HTMLDivElement>(null);
	const costs = useRef<HTMLDivElement>(null);
	const mirrors = useMemo(() => [bands, costs], []);
	const text = `${face.text ?? ''}\n${face.flavorText ?? ''}`;
	useShrinkToFit(name, face.name, 'width', 0.6);
	useShrinkToFit(type, face.type ?? '', 'width', 0.6);
	useShrinkToFit(box, text, 'height', 0.5, mirrors);

	const walker = /\bPlaneswalker\b/.test(face.type ?? '');
	const frame = cardFrame({ manaCost: face.manaCost, type: face.type, text: face.text });
	const { layers, pt } = frameLayers(frame, face.type);
	const cardStats = stats(face);
	const art = face.art && face.art !== failedArt ? face.art : null;
	const rarity = face.rarity ? RARITY_LETTERS[face.rarity.toLowerCase()] ?? null : null;
	const number = face.number && /^\d+$/.test(face.number) ? face.number.padStart(4, '0') : face.number;
	const abilities = walker ? walkerAbilities(face.text) : [];

	return (
		<article className={`${styles['card']} ${className ?? ''}`} data-frame={frame.kind} data-layout={walker ? 'planeswalker' : 'regular'} aria-label={face.name}>
			<div className={styles['art']}>
				{walker && art && <img className={styles['art-backdrop']} src={art} alt="" draggable={false} />}
				{art && (
					<img
						className={styles['art-image']}
						src={art}
						alt=""
						draggable={false}
						onError={function () {
							setFailedArt(art);
						}}
					/>
				)}
			</div>
			{walker && (
				<div ref={bands} className={`${styles['abilities']} ${styles['bands']}`} aria-hidden="true">
					{abilities.map((ability, index) => (
						<div key={index} className={styles['ability']} data-shade={index % 2 === 0 ? 'light' : 'dark'} data-static={ability.cost ? undefined : ''}>
							<span>{printedText(ability.text)}</span>
						</div>
					))}
				</div>
			)}
			{layers.map((layer, index) => (
				<img key={index} className={styles['frame']} style={layerStyle(layer)} src={layer.src} alt="" draggable={false} />
			))}
			<OfflineNote kind={note ?? 'button'} />
			<div className={styles['title']}>
				<span ref={name} className={styles['name']}>
					{face.name}
				</span>
				{face.manaCost && (
					<span className={styles['cost']}>
						<ManaCost cost={face.manaCost} />
					</span>
				)}
			</div>
			<div className={styles['type-line']}>
				<span ref={type} className={styles['type']}>
					{face.type}
				</span>
				{face.setCode && <SetSymbol setCode={face.setCode} rarity={face.rarity} />}
			</div>
			{walker ? (
				<>
					<div ref={box} className={styles['abilities']}>
						{abilities.map((ability, index) => (
							<div key={index} className={styles['ability']} data-static={ability.cost ? undefined : ''}>
								<span>
									<ManaText text={printedText(ability.text)} />
								</span>
							</div>
						))}
					</div>
					{/* The loyalty costs, apart from the text so their shields, which overhang short abilities, never count as text overflowing. */}
					<div ref={costs} className={`${styles['abilities']} ${styles['costs']}`} aria-hidden="true">
						{abilities.map((ability, index) => (
							<div key={index} className={styles['ability']} data-static={ability.cost ? undefined : ''}>
								<span>{printedText(ability.text)}</span>
								{ability.cost && (
									<span className={styles['loyalty-cost']} data-kind={ability.kind}>
										<span>{ability.cost}</span>
									</span>
								)}
							</div>
						))}
					</div>
				</>
			) : (
				<div ref={box} className={styles['box']}>
					{face.text?.split('\n').map((line, i) => (
						<p key={i}>
							<ManaText text={printedText(line)} />
						</p>
					))}
					{face.flavorText && <p className={styles['flavor']}>{face.flavorText}</p>}
				</div>
			)}
			{walker
				? face.loyalty && <div className={styles['loyalty']}>{face.loyalty}</div>
				: cardStats && (
						<>
							<img className={styles['pt-box']} src={pt} alt="" draggable={false} />
							<div className={styles['stats']}>{cardStats}</div>
						</>
					)}
			<footer className={styles['footer']}>
				<span className={styles['info-first']}>{[rarity, number].filter(Boolean).join(' ')}</span>
				<span className={styles['info-second']}>
					{[face.setCode, 'EN'].filter(Boolean).join(' • ')}
					{face.artist && (
						<>
							{' '}
							<svg className={styles['brush']} viewBox="0 0 24 12" aria-hidden="true">
								<path d="M0 7.5C3 4 6 4.5 8.5 5.5l2-1.5c.6-.4 1.4-.4 1.9.1L24 1.5 13 7.8c-.2.7-.8 1.2-1.5 1.3l-2.4.4C6.7 11.6 3 12 0 7.5z" />
							</svg>
							<span className={styles['artist']}>{face.artist}</span>
						</>
					)}
				</span>
			</footer>
		</article>
	);
}
