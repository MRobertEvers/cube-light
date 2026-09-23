import React, {
	Fragment,
	RefObject,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState
} from 'react';
import type { CardListCompletions } from 'src/ui/kit/hooks/useCardListLint';
import { useHistoryModal } from 'src/ui/kit/hooks/useHistoryModal';
import { CardNameSpan, locateCardName } from 'src/domain/card-names/parse-card-list';
import type { CardListProblem } from 'src/domain/card-names/card-list-problem';
import styles from './card-list-editor.module.css';
import { PrintingSheet } from './PrintingSheet';

type Metrics = {
	lineHeight: number;
	charWidth: number;
	top: number;
	left: number;
};

/** Where autocomplete replaces text: a card name on one line, up to the caret. */
type CompletionTarget = {
	line: number;
	start: number;
	end: number;
	caret: number;
	query: string;
};

const MIN_COMPLETION_QUERY = 2;
const COMPLETION_WIDTH = 300;
const POPOVER_WIDTH = 280;
/** How long typing must pause before the typed line's warning shows. */
const TYPING_IDLE_MS = 350;
/** Two taps on one line within this long open its menu. */
const DOUBLE_TAP_MS = 350;

function lineOffset(text: string, line: number): number {
	let offset = 0;
	for (let i = 1; i < line; i++) offset = text.indexOf('\n', offset) + 1;
	return offset;
}

function caretPosition(text: string, caret: number) {
	const before = text.slice(0, caret);
	const lineStart = before.lastIndexOf('\n') + 1;
	return {
		line: before.split('\n').length,
		column: caret - lineStart,
		lineText: text.slice(
			lineStart,
			(text.indexOf('\n', caret) + 1 || text.length + 1) - 1
		)
	};
}

// Set while replaceInLine edits, so its input event is not mistaken for typing.
let replacing = false;

/**
 * Replaces the text between offsets [start, end) with `replacement` as a native edit, so
 * it can be undone and still reaches React through the textarea's input event.
 */
export function replaceRange(
	textarea: HTMLTextAreaElement,
	start: number,
	end: number,
	replacement: string
) {
	textarea.focus();
	textarea.setSelectionRange(start, end);
	replacing = true;
	try {
		if (document.execCommand('insertText', false, replacement)) return;
		const value =
			textarea.value.slice(0, start) +
			replacement +
			textarea.value.slice(end);
		Object.getOwnPropertyDescriptor(
			HTMLTextAreaElement.prototype,
			'value'
		)?.set?.call(textarea, value);
		textarea.dispatchEvent(new Event('input', { bubbles: true }));
		const caret = start + replacement.length;
		textarea.setSelectionRange(caret, caret);
	} finally {
		replacing = false;
	}
}

/** Replaces `line`'s columns [start, end) with `replacement`, as replaceRange does. */
export function replaceInLine(
	textarea: HTMLTextAreaElement,
	line: number,
	start: number,
	end: number,
	replacement: string
) {
	const offset = lineOffset(textarea.value, line);
	replaceRange(textarea, offset + start, offset + end, replacement);
}

/**
 * Folds line `duplicate` into the earlier line `first`, which names the same card and
 * printing: `first` gets both counts and `duplicate` is deleted.
 */
export function mergeLines(
	textarea: HTMLTextAreaElement,
	first: number,
	duplicate: number
) {
	const lines = textarea.value.split('\n');
	const firstSpan = locateCardName(lines[first - 1] ?? '');
	const duplicateSpan = locateCardName(lines[duplicate - 1] ?? '');
	if (!firstSpan || !duplicateSpan || duplicate <= first) return;
	function countOf(line: string, span: CardNameSpan) {
		return span.count
			? Number(line.slice(span.count.start, span.count.end))
			: 1;
	}
	const total = Math.min(
		999,
		countOf(lines[first - 1], firstSpan) +
			countOf(lines[duplicate - 1], duplicateSpan)
	);
	// The later line goes first, so the earlier line's position doesn't move.
	const start = lineOffset(textarea.value, duplicate);
	replaceRange(textarea, start - 1, start + lines[duplicate - 1].length, '');
	if (firstSpan.count)
		replaceInLine(
			textarea,
			first,
			firstSpan.count.start,
			firstSpan.count.end,
			String(total)
		);
	else
		replaceInLine(
			textarea,
			first,
			firstSpan.start,
			firstSpan.start,
			`${total} `
		);
}

function completionTarget(
	text: string,
	caret: number
): CompletionTarget | null {
	const { line, column, lineText } = caretPosition(text, caret);
	const span = locateCardName(lineText);
	if (!span || column < span.start) return null;
	// Only while typing at the end of the name, allowing spaces between words.
	if (column < span.end || lineText.slice(span.end, column).trim())
		return null;
	const query = lineText.slice(span.start, column);
	if (query.trim().length < MIN_COMPLETION_QUERY) return null;
	return {
		line,
		start: span.start,
		end: Math.max(span.end, column),
		caret,
		query
	};
}

export type CardListEditorProps = {
	id: string;
	value: string;
	onChange: (value: string) => void;
	textareaRef: RefObject<HTMLTextAreaElement | null>;
	placeholder?: string;
	disabled?: boolean;
	/** Unknown-name problems from the checker; stale ones are ignored per line. */
	problems: CardListProblem[];
	completions: CardListCompletions | null;
	onCompletionQuery: (query: string | null) => void;
	/** The line being typed on, whose problem is not shown until the user moves on. */
	onTypingLineChange: (line: number | null) => void;
	className?: string;
	'aria-describedby'?: string;
	'aria-invalid'?: boolean;
};

export function CardListEditor(props: CardListEditorProps) {
	const {
		id,
		value,
		onChange,
		textareaRef,
		placeholder,
		disabled,
		problems,
		completions,
		onCompletionQuery,
		onTypingLineChange
	} = props;
	const printingModal = useHistoryModal<{ line: number; name: string }>(
		'add-cards-printing'
	);
	const [scroll, setScroll] = useState({ top: 0, left: 0, height: 0 });
	const [metrics, setMetrics] = useState<Metrics | null>(null);
	const [target, setTargetState] = useState<CompletionTarget | null>(null);
	// Selection events can arrive before a render commits, so they read the target from here.
	const targetRef = useRef<CompletionTarget | null>(null);
	function setTarget(next: CompletionTarget | null) {
		targetRef.current = next;
		setTargetState(next);
	}
	const [activeOption, setActiveOption] = useState({ key: '', index: 0 });
	const [typingLine, setTypingLine] = useState<number | null>(null);
	const typingLineRef = useRef<number | null>(null);
	// A line's menu, opened from its marker or from the line itself (right click, double tap).
	const [menuState, setMenu] = useState<{
		line: number;
		atName: boolean;
		name: string;
	} | null>(null);
	const printingTarget = printingModal.value;
	// Where a collapsed caret sits while the editor has focus, for the Tab hint.
	const [caret, setCaret] = useState<{ line: number; column: number } | null>(
		null
	);
	const pointer = useRef({
		type: '',
		hadSelection: false,
		menuButton: false
	});
	const lastTap = useRef({ line: 0, time: -Infinity });
	const popoverRef = useRef<HTMLDivElement>(null);
	const listId = useId();
	const popoverId = useId();

	const lines = value.split('\n');
	const fresh = problems.filter(
		(problem) => lines[problem.line - 1] === problem.lineText
	);
	const shown = fresh.filter((problem) => problem.line !== typingLine);
	const shownByLine = new Map(
		shown.map((problem) => [problem.line, problem])
	);
	const currentMenuSpan = menuState
		? locateCardName(lines[menuState.line - 1] ?? '')
		: null;
	const menu =
		menuState && currentMenuSpan?.name === menuState.name
			? menuState
			: null;
	const menuSpan = menu ? currentMenuSpan : null;
	const menuProblem = menu ? shownByLine.get(menu.line) : undefined;
	const menuUnknown = !!menu && fresh.some((p) => p.line === menu.line);
	// While the caret is on a card named on other lines too, those lines are marked.
	const caretName = caret
		? locateCardName(lines[caret.line - 1] ?? '')?.name.toLowerCase()
		: undefined;
	const namedLines = caretName
		? lines.flatMap((line, index) =>
				locateCardName(line)?.name.toLowerCase() === caretName
					? [index + 1]
					: []
			)
		: [];
	const siblingLines = new Set(namedLines.length > 1 ? namedLines : []);
	const currentPrintingSpan = printingTarget
		? locateCardName(lines[printingTarget.line - 1] ?? '')
		: null;
	const printingLine =
		printingTarget && currentPrintingSpan?.name === printingTarget.name
			? printingTarget.line
			: null;
	const printingSpan = printingLine === null ? null : currentPrintingSpan;

	const options =
		target && completions?.query === target.query ? completions.names : [];
	const optionsKey = options.join('\n');
	const activeIndex =
		activeOption.key === optionsKey && activeOption.index < options.length
			? activeOption.index
			: 0;
	// Nothing to offer when the name is already complete.
	const showCompletions =
		options.length > 0 &&
		options[0].toLowerCase() !== target!.query.trim().toLowerCase();
	// The rest of the highlighted name, previewed after the caret when it extends what
	// was typed and nothing but spaces follows on the line.
	const active = showCompletions ? options[activeIndex] : undefined;
	const ghost =
		active &&
		target &&
		active.toLowerCase().startsWith(target.query.toLowerCase()) &&
		!lines[target.line - 1].slice(target.end).trim()
			? active.slice(target.query.length)
			: '';

	useLayoutEffect(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;
		const style = getComputedStyle(textarea);
		const context = document.createElement('canvas').getContext('2d');
		if (context) context.font = style.font;
		const lineHeight =
			parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5;
		setMetrics({
			lineHeight,
			charWidth: context?.measureText('0'.repeat(20)).width
				? context.measureText('0'.repeat(20)).width / 20
				: parseFloat(style.fontSize) * 0.6,
			top:
				parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop),
			left:
				parseFloat(style.borderLeftWidth) +
				parseFloat(style.paddingLeft)
		});
		const observer = new ResizeObserver(() =>
			setScroll((previous) => ({
				top: previous.top,
				left: previous.left,
				height: textarea.clientHeight
			}))
		);
		observer.observe(textarea);
		return function () {
			return observer.disconnect();
		};
	}, [textareaRef]);

	function changeTypingLine(next: number | null) {
		if (typingLineRef.current === next) return;
		typingLineRef.current = next;
		setTypingLine(next);
		onTypingLineChange(next);
	}

	// A pause in typing counts as moving on, so the warning doesn't wait for a new line.
	useEffect(() => {
		if (typingLine === null) return;
		const timer = window.setTimeout(
			() => changeTypingLine(null),
			TYPING_IDLE_MS
		);
		return function () {
			return window.clearTimeout(timer);
		};
	}, [typingLine, value]);

	useEffect(() => {
		if (menu)
			popoverRef.current?.querySelector<HTMLElement>('button')?.focus();
		// Focus only when a different line's menu opens.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [menu?.line]);

	function closeCompletions() {
		if (targetRef.current) {
			setTarget(null);
			onCompletionQuery(null);
		}
	}

	/** Keeps the completion target only while the caret stays where it was typed. */
	function syncCaret() {
		const textarea = textareaRef.current;
		if (!textarea) return;
		const caret = textarea.selectionStart;
		const { line, column } = caretPosition(textarea.value, caret);
		setCaret(
			textarea.selectionEnd === caret &&
				document.activeElement === textarea
				? { line, column }
				: null
		);
		if (typingLineRef.current !== line) changeTypingLine(null);
		const current = targetRef.current;
		if (
			current &&
			(caret !== current.caret || textarea.selectionEnd !== caret)
		)
			closeCompletions();
	}

	function accept(name: string) {
		const textarea = textareaRef.current;
		if (!textarea || !target) return;
		replaceInLine(textarea, target.line, target.start, target.end, name);
		setTarget(null);
		onCompletionQuery(null);
	}

	function fix(problem: CardListProblem, name: string) {
		const textarea = textareaRef.current;
		if (!textarea) return;
		setMenu(null);
		replaceInLine(textarea, problem.line, problem.start, problem.end, name);
	}

	/** Selects the line's count for typing over, adding a count of 1 when it has none. */
	function editCount(line: number, span: CardNameSpan) {
		const textarea = textareaRef.current;
		if (!textarea) return;
		setMenu(null);
		const offset = lineOffset(textarea.value, line);
		if (span.count) {
			textarea.focus();
			textarea.setSelectionRange(
				offset + span.count.start,
				offset + span.count.end
			);
		} else {
			// 1 is also the default, so the line means the same until a new count is typed.
			replaceInLine(textarea, line, span.start, span.start, '1 ');
			textarea.setSelectionRange(
				offset + span.start,
				offset + span.start + 1
			);
		}
	}

	function setPrinting(line: number, setCode: string | null) {
		const textarea = textareaRef.current;
		printingModal.close();
		if (!textarea) return;
		const span = locateCardName(textarea.value.split('\n')[line - 1] ?? '');
		if (!span) return;
		if (span.printing)
			replaceInLine(
				textarea,
				line,
				setCode ? span.printing.start : span.end,
				span.printing.end,
				setCode ? `(${setCode})` : ''
			);
		else if (setCode)
			replaceInLine(textarea, line, span.end, span.end, ` (${setCode})`);
		else textarea.focus();
	}

	function openMenu(line: number, atName: boolean) {
		const span = locateCardName(lines[line - 1] ?? '');
		if (!span) return false;
		closeCompletions();
		setMenu({ line, atName, name: span.name });
		return true;
	}

	function rowTop(line: number) {
		return metrics
			? metrics.top + (line - 1) * metrics.lineHeight - scroll.top
			: 0;
	}
	/** The line under a pointer; below the last line counts as the last line. */
	function lineAt(clientY: number) {
		const textarea = textareaRef.current;
		if (!textarea || !metrics) return null;
		const y =
			clientY -
			textarea.getBoundingClientRect().top -
			metrics.top +
			textarea.scrollTop;
		if (y < 0) return null;
		return Math.min(Math.floor(y / metrics.lineHeight) + 1, lines.length);
	}

	/** Phones get the caret at the end of the tapped line; a second tap opens its menu. */
	function tap(event: React.MouseEvent<HTMLTextAreaElement>) {
		const line = lineAt(event.clientY);
		if (line === null) return;
		const previous = lastTap.current;
		lastTap.current = { line, time: event.timeStamp };
		if (
			previous.line === line &&
			event.timeStamp - previous.time < DOUBLE_TAP_MS &&
			openMenu(line, true)
		) {
			lastTap.current = { line: 0, time: -Infinity };
			return;
		}
		const textarea = event.currentTarget;
		const end = lineOffset(textarea.value, line) + lines[line - 1].length;
		textarea.setSelectionRange(end, end);
	}

	/** The caret line and the columns of the selection on it, or null across lines. */
	function selectionOnLine(textarea: HTMLTextAreaElement) {
		const { line, column, lineText } = caretPosition(
			textarea.value,
			textarea.selectionStart
		);
		const end = column + textarea.selectionEnd - textarea.selectionStart;
		return end <= lineText.length ? { line, column, end, lineText } : null;
	}

	/** Tab takes the top suggestion for an unknown name the selection is in or just after. */
	function acceptSuggestion() {
		const textarea = textareaRef.current;
		const at = textarea && selectionOnLine(textarea);
		// Checked even before the squiggle shows, so Tab mid-typing still corrects.
		const problem = at && fresh.find((p) => p.line === at.line);
		if (
			!at ||
			!problem?.suggestions.length ||
			at.column < problem.start ||
			at.end > problem.end
		)
			return false;
		fix(problem, problem.suggestions[0]);
		return true;
	}

	/**
	 * Enter on a card line's count confirms it, moving to the line's end instead of
	 * splitting the count from the name. At the very start of the line it still splits.
	 */
	function confirmCount() {
		const textarea = textareaRef.current;
		const at = textarea && selectionOnLine(textarea);
		const span = at && locateCardName(at.lineText);
		if (
			!at ||
			!span?.count ||
			at.end <= span.count.start ||
			at.column >= span.start
		)
			return false;
		const end = lineOffset(textarea.value, at.line) + at.lineText.length;
		textarea.setSelectionRange(end, end);
		return true;
	}

	/**
	 * Tab steps through the line's count, name and set code, selecting each to type over;
	 * Shift+Tab steps back. Returns false past either end, leaving Tab to move focus.
	 */
	function stepField(backward: boolean) {
		const textarea = textareaRef.current;
		const at = textarea && selectionOnLine(textarea);
		const span = at && locateCardName(at.lineText);
		if (!at || !span) return false;
		const length = at.lineText.length;
		const printing = span.printing;
		// Each field is selected by `select` and holds the caret anywhere in `within`.
		const fields = [
			span.count && {
				select: span.count,
				within: { start: span.count.start, end: span.start - 1 }
			},
			{
				select: span,
				within: { start: span.start, end: printing?.start ?? length }
			},
			printing && {
				select: {
					start: printing.start + 1,
					end: printing.start + 1 + printing.setCode.length
				},
				within: { start: printing.start, end: length }
			}
		].filter((field) => !!field);
		const current = fields.findIndex((options) => {
			const { within } = options;
			return at.column >= within.start && at.end <= within.end;
		});
		const next = fields[current + (backward ? -1 : 1)];
		if (current < 0 || !next) return false;
		const offset = lineOffset(textarea.value, at.line);
		closeCompletions();
		textarea.setSelectionRange(
			offset + next.select.start,
			offset + next.select.end
		);
		return true;
	}

	function rowVisible(line: number) {
		return (
			!!metrics &&
			rowTop(line) >= metrics.top - metrics.lineHeight / 2 &&
			rowTop(line) + metrics.lineHeight <= scroll.height + metrics.top
		);
	}

	// What Tab would put in place of an unknown name at the caret, when no list is open.
	const hintProblem =
		!showCompletions && !menu && caret
			? fresh.find(
					(problem) =>
						problem.line === caret.line &&
						problem.suggestions.length > 0 &&
						caret.column >= problem.start &&
						caret.column <= problem.end
				)
			: undefined;
	const hintStyle: React.CSSProperties | undefined =
		hintProblem && metrics
			? {
					top: rowTop(hintProblem.line) + metrics.lineHeight + 2,
					left: Math.max(
						0,
						metrics.left +
							(hintProblem.start - 0.5) * metrics.charWidth -
							scroll.left
					)
				}
			: undefined;

	let completionStyle: React.CSSProperties | undefined;
	if (showCompletions && metrics && target) {
		const width = textareaRef.current?.clientWidth ?? COMPLETION_WIDTH;
		const left =
			metrics.left +
			(target.start - 0.5) * metrics.charWidth -
			scroll.left;
		completionStyle = {
			top: rowTop(target.line) + metrics.lineHeight + 2,
			left: Math.max(0, Math.min(left, width - COMPLETION_WIDTH))
		};
	}

	return (
		<div className={`${styles['editor']} ${props.className ?? ''}`}>
			<div className={styles['backdrop']} aria-hidden="true">
				<div
					className={styles['backdrop-text']}
					style={{
						transform: `translate(${-scroll.left}px, ${-scroll.top}px)`
					}}
				>
					{lines.map((line, index) => {
						const problem = shownByLine.get(index + 1);
						const content =
							ghost && target!.line === index + 1 ? (
								<>
									{line.slice(0, target!.end)}
									<span className={styles['ghost']}>
										{ghost}
									</span>
								</>
							) : problem ? (
								<>
									{line.slice(0, problem.start)}
									<mark className={styles['unknown']}>
										{line.slice(problem.start, problem.end)}
									</mark>
									{line.slice(problem.end)}
								</>
							) : (
								line
							);
						return (
							<Fragment key={index}>
								{index > 0 && '\n'}
								{siblingLines.has(index + 1) ? (
									<span className={styles['sibling']}>
										{content}
									</span>
								) : (
									content
								)}
							</Fragment>
						);
					})}
					{'\n '}
				</div>
			</div>
			<textarea
				id={id}
				ref={textareaRef}
				className={styles['input']}
				value={value}
				placeholder={placeholder}
				spellCheck={false}
				autoComplete="off"
				autoCapitalize="off"
				autoCorrect="off"
				wrap="off"
				disabled={disabled}
				aria-describedby={props['aria-describedby']}
				aria-invalid={props['aria-invalid']}
				aria-autocomplete="list"
				aria-controls={showCompletions ? listId : undefined}
				aria-activedescendant={
					showCompletions ? `${listId}-${activeIndex}` : undefined
				}
				onChange={(event) => {
					const textarea = event.target;
					const inputType =
						(event.nativeEvent as InputEvent).inputType ?? '';
					onChange(textarea.value);
					// Typing (not pasting) holds back the line's warning and drives autocomplete.
					const typing =
						!replacing &&
						((inputType.startsWith('insert') &&
							inputType !== 'insertFromPaste' &&
							inputType !== 'insertFromDrop' &&
							inputType !== 'insertLineBreak') ||
							inputType.startsWith('delete'));
					const caret = textarea.selectionStart;
					const next =
						typing && textarea.selectionEnd === caret
							? completionTarget(textarea.value, caret)
							: null;
					const position = caretPosition(textarea.value, caret);
					setCaret(
						textarea.selectionEnd === caret
							? { line: position.line, column: position.column }
							: null
					);
					changeTypingLine(typing ? position.line : null);
					setTarget(next);
					onCompletionQuery(next ? next.query : null);
				}}
				onSelect={syncCaret}
				onPointerDown={(event) => {
					const textarea = event.currentTarget;
					// Read before the browser moves the caret for this press.
					pointer.current = {
						type: event.pointerType,
						hadSelection:
							textarea.selectionStart !== textarea.selectionEnd,
						menuButton:
							event.button === 2 ||
							(event.button === 0 && event.ctrlKey)
					};
				}}
				onContextMenu={(event) => {
					const { type, hadSelection, menuButton } = pointer.current;
					pointer.current.menuButton = false;
					// A right click opens the clicked line's menu and the menu key the caret
					// line's. Over a selection, or from a long press, the browser's menu stays.
					const line = menuButton
						? type === 'mouse' && !hadSelection
							? lineAt(event.clientY)
							: null
						: caretPosition(
								event.currentTarget.value,
								event.currentTarget.selectionStart
							).line;
					if (line !== null && openMenu(line, true))
						event.preventDefault();
				}}
				onClick={(event) => {
					if (pointer.current.type === 'touch') tap(event);
				}}
				onScroll={(event) => {
					const textarea = event.currentTarget;
					setScroll({
						top: textarea.scrollTop,
						left: textarea.scrollLeft,
						height: textarea.clientHeight
					});
				}}
				onBlur={() => {
					closeCompletions();
					changeTypingLine(null);
					setCaret(null);
				}}
				onKeyDown={(event) => {
					if (
						!showCompletions &&
						event.key === 'Enter' &&
						!event.shiftKey &&
						!event.metaKey &&
						!event.ctrlKey &&
						!event.altKey &&
						confirmCount()
					) {
						event.preventDefault();
						return;
					}
					// Tab stays in the editor even with nothing to do; Shift+Tab past the
					// line's first field still moves focus, so the editor is never a trap.
					if (
						!showCompletions &&
						event.key === 'Tab' &&
						!event.metaKey &&
						!event.ctrlKey &&
						!event.altKey &&
						((!event.shiftKey && acceptSuggestion()) ||
							stepField(event.shiftKey) ||
							!event.shiftKey)
					)
						event.preventDefault();
					if (!showCompletions) return;
					if (event.key === 'Escape') {
						event.preventDefault();
						event.stopPropagation();
						closeCompletions();
					} else if (
						event.key === 'ArrowDown' ||
						event.key === 'ArrowUp'
					) {
						event.preventDefault();
						const step = event.key === 'ArrowDown' ? 1 : -1;
						setActiveOption({
							key: optionsKey,
							index:
								(activeIndex + step + options.length) %
								options.length
						});
					} else if (
						(event.key === 'Enter' || event.key === 'Tab') &&
						!event.shiftKey &&
						!event.metaKey &&
						!event.ctrlKey &&
						!event.altKey
					) {
						event.preventDefault();
						accept(options[activeIndex]);
					}
				}}
			/>
			<div className={styles['markers']}>
				{shown
					.filter((problem) => rowVisible(problem.line))
					.map((problem) => (
						<button
							key={problem.line}
							type="button"
							tabIndex={-1}
							className={styles['marker']}
							style={{
								top: rowTop(problem.line),
								height: metrics!.lineHeight
							}}
							aria-label={`Line ${problem.line}: unknown card “${problem.name}”. Show suggestions.`}
							aria-expanded={menu?.line === problem.line}
							aria-controls={
								menu?.line === problem.line
									? popoverId
									: undefined
							}
							title={
								problem.suggestions.length
									? `Unknown card. Did you mean ${problem.suggestions[0]}? Press Tab after the name to use it.`
									: 'Unknown card'
							}
							onMouseDown={(event) => event.preventDefault()}
							onClick={() => {
								if (menu?.line === problem.line) setMenu(null);
								else openMenu(problem.line, false);
							}}
						>
							<span aria-hidden="true">!</span>
						</button>
					))}
			</div>
			{menu && menuSpan && metrics && rowVisible(menu.line) && (
				<div
					ref={popoverRef}
					id={popoverId}
					className={styles['popover']}
					role="group"
					aria-label={`Line ${menu.line}: ${menuSpan.name}`}
					style={{
						top: rowTop(menu.line) + metrics.lineHeight + 4,
						right: menu.atName ? 'auto' : undefined,
						left: menu.atName
							? Math.max(
									6,
									Math.min(
										metrics.left +
											menuSpan.start * metrics.charWidth -
											scroll.left,
										(textareaRef.current?.clientWidth ?? 0) -
											POPOVER_WIDTH -
											6
									)
								)
							: undefined
					}}
					onKeyDown={(event) => {
						if (event.key === 'Escape') {
							event.preventDefault();
							event.stopPropagation();
							setMenu(null);
							textareaRef.current?.focus();
						}
					}}
					onBlur={(event) => {
						if (!event.currentTarget.contains(event.relatedTarget))
							setMenu(null);
					}}
				>
					<div className={styles['menu-tiles']}>
						<button
							type="button"
							className={styles['menu-tile']}
							onClick={() => editCount(menu.line, menuSpan)}
						>
							<span className={styles['menu-tile-label']}>
								Count
							</span>
							<span className={styles['menu-tile-value']}>
								{menuSpan.count
									? lines[menu.line - 1].slice(
											menuSpan.count.start,
											menuSpan.count.end
										)
									: 1}
							</span>
						</button>
						<button
							type="button"
							className={styles['menu-tile']}
							disabled={menuUnknown}
							onClick={() => {
								setMenu(null);
								printingModal.open({
									line: menu.line,
									name: menuSpan.name
								});
							}}
						>
							<span className={styles['menu-tile-label']}>
								Print version
							</span>
							<span className={styles['menu-tile-value']}>
								{menuUnknown
									? 'Unknown card'
									: (menuSpan.printing?.setCode ?? 'Any')}
							</span>
						</button>
					</div>
					{menuProblem && menuProblem.suggestions.length > 0 && (
						<div className={styles['menu-section']}>
							<p className={styles['popover-hint']}>
								<strong>{menuProblem.name}</strong> isn’t a
								known card. Did you mean
							</p>
							<ul className={styles['popover-options']}>
								{menuProblem.suggestions.map((name) => (
									<li key={name}>
										<button
											type="button"
											onClick={() =>
												fix(menuProblem, name)
											}
										>
											{name}
										</button>
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}
			{printingLine !== null && printingSpan && (
				<PrintingSheet
					key={`${printingLine}:${printingSpan.name}`}
					name={printingSpan.name}
					setCode={printingSpan.printing?.setCode ?? null}
					onPick={(setCode) => setPrinting(printingLine, setCode)}
					onClose={() => {
						printingModal.close();
						textareaRef.current?.focus();
					}}
				/>
			)}
			{showCompletions && (
				<ul
					id={listId}
					className={styles['completions']}
					role="listbox"
					aria-label="Card name suggestions"
					style={completionStyle}
				>
					{options.map((name, index) => (
						<li
							id={`${listId}-${index}`}
							key={name}
							role="option"
							aria-selected={index === activeIndex}
							className={
								index === activeIndex
									? styles['active']
									: undefined
							}
							onMouseDown={(event) => event.preventDefault()}
							onMouseEnter={() =>
								setActiveOption({ key: optionsKey, index })
							}
							onClick={() => accept(name)}
						>
							<span className={styles['option-name']}>
								{name}
							</span>
							{index === activeIndex && <TabKey />}
						</li>
					))}
				</ul>
			)}
			{hintProblem && hintStyle && rowVisible(hintProblem.line) && (
				<button
					type="button"
					tabIndex={-1}
					className={styles['tab-hint']}
					style={hintStyle}
					onMouseDown={(event) => event.preventDefault()}
					onClick={() => fix(hintProblem, hintProblem.suggestions[0])}
				>
					<TabKey />
					<span className={styles['option-name']}>
						{hintProblem.suggestions[0]}
					</span>
				</button>
			)}
			<span className={styles['visually-hidden']} aria-live="polite">
				{showCompletions
					? `${options.length} card ${options.length === 1 ? 'name' : 'names'} suggested. Use the arrow keys and Enter to choose.`
					: hintProblem
						? `Unknown card. Press Tab for ${hintProblem.suggestions[0]}.`
						: ''}
			</span>
		</div>
	);
}

/** A keycap showing that Tab accepts; hidden on touch screens, which have no Tab key. */
function TabKey() {
	return (
		<kbd className={styles['tab-key']} aria-hidden="true">
			<svg viewBox="0 0 16 16" width="11" height="11">
				<path
					d="M2 8h10M8.5 4.5 12 8l-3.5 3.5M14 3.5v9"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.6"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
			Tab
		</kbd>
	);
}
