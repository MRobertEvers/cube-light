import React, { type CSSProperties, useRef, useState } from 'react';
import { type CardFrame, cardFrame } from '../../../../domain/models/card-frame';
import type { DeckColor } from '../../../../domain/deck/deck-colors';
import { ManaCost, ManaText } from '../ManaCost/ManaCost';
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
const PT_BOXES: Record<DeckColor, string> = { W: ptW, U: ptU, B: ptB, R: ptR, G: ptG };
// A two-color frame's second color, across the right side as printed hybrid cards blend.
const RIGHT_SIDE = 'linear-gradient(90deg, transparent 44%, #000 56%)';

/**
 * The M15 frame layers and power/toughness box for a frame, bottom first: one color, a
 * hybrid's two colors split left and right, gold, artifact (vehicles their own), and lands
 * on the land frame with pinlines in the colors of mana they make.
 */
function frameLayers(frame: CardFrame, type: string | null): { layers: FrameLayer[]; pt: string } {
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
 * they are stored.
 */
export function RenderedCard(props: { face: RenderedCardFace; className?: string }) {
	const { face, className } = props;
	const [failedArt, setFailedArt] = useState<string | null>(null);
	const name = useRef<HTMLSpanElement>(null);
	const type = useRef<HTMLSpanElement>(null);
	const box = useRef<HTMLDivElement>(null);
	const text = `${face.text ?? ''}\n${face.flavorText ?? ''}`;
	useShrinkToFit(name, face.name, 'width', 0.6);
	useShrinkToFit(type, face.type ?? '', 'width', 0.6);
	useShrinkToFit(box, text, 'height', 0.5);

	const frame = cardFrame({ manaCost: face.manaCost, type: face.type, text: face.text });
	const { layers, pt } = frameLayers(frame, face.type);
	const cardStats = stats(face);
	const art = face.art && face.art !== failedArt ? face.art : null;
	const rarity = face.rarity ? RARITY_LETTERS[face.rarity.toLowerCase()] ?? null : null;
	const number = face.number && /^\d+$/.test(face.number) ? face.number.padStart(4, '0') : face.number;

	return (
		<article className={`${styles['card']} ${className ?? ''}`} data-frame={frame.kind} aria-label={face.name}>
			<div className={styles['art']}>
				{art && (
					<img
						src={art}
						alt=""
						draggable={false}
						onError={function () {
							setFailedArt(art);
						}}
					/>
				)}
			</div>
			{layers.map((layer, index) => (
				<img key={index} className={styles['frame']} style={layerStyle(layer)} src={layer.src} alt="" draggable={false} />
			))}
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
			<div ref={box} className={styles['box']}>
				{face.text?.split('\n').map((line, i) => (
					<p key={i}>
						<ManaText text={printedText(line)} />
					</p>
				))}
				{face.flavorText && <p className={styles['flavor']}>{face.flavorText}</p>}
			</div>
			{cardStats && (
				<>
					<img className={styles['pt-box']} src={pt} alt="" draggable={false} />
					<div className={styles['stats']}>{cardStats}</div>
				</>
			)}
			<footer className={styles['footer']}>
				<span>{[rarity, number].filter(Boolean).join(' ')}</span>
				<span>
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
