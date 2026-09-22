import React, {
	ReactNode,
	Ref,
	useEffect,
	useId,
	useRef,
	useState
} from 'react';

import styles from './suggestion-input.module.css';

export type SuggestionInputProps = {
	id: string;
	value: string;
	suggestions: string[];
	/** Whether the suggestion list is open; it only shows when there are suggestions. */
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onChange: (value: string) => void;
	onSelect: (suggestion: string, keepFocus: boolean) => void;
	/** Suggestion chosen by Enter when none is highlighted. */
	enterSelects?: string;
	/** Suggestion chosen by Tab (focus moves on as usual). */
	tabSelects?: string;
	inputRef?: Ref<HTMLInputElement>;
	placeholder?: string;
	disabled?: boolean;
	/** Status icon shown at the right edge of the input. */
	indicator?: ReactNode;
	listLabel: string;
	'aria-describedby'?: string;
	'aria-invalid'?: boolean;
};

export function SuggestionInput(props: SuggestionInputProps) {
	const {
		id,
		value,
		suggestions,
		open,
		onOpenChange,
		onChange,
		onSelect,
		enterSelects,
		tabSelects,
		inputRef,
		placeholder,
		disabled,
		indicator,
		listLabel
	} = props;
	const [activeIndex, setActiveIndex] = useState(-1);
	const listRef = useRef<HTMLUListElement>(null);
	const listId = useId();
	const showSuggestions = open && suggestions.length > 0;
	const suggestionsKey = suggestions.join('\n');

	useEffect(() => setActiveIndex(-1), [suggestionsKey]);

	useEffect(() => {
		if (showSuggestions && activeIndex >= 0) {
			(
				listRef.current?.children[activeIndex] as
					HTMLElement | undefined
			)?.scrollIntoView({ block: 'nearest' });
		}
	}, [activeIndex, showSuggestions]);

	function select(suggestion: string, keepFocusArg?: boolean) {
		const keepFocus = keepFocusArg === undefined ? true : keepFocusArg;

		setActiveIndex(-1);
		onSelect(suggestion, keepFocus);
	}

	return (
		<div className={styles['search-field']}>
			<input
				id={id}
				ref={inputRef}
				className={
					indicator !== undefined
						? styles['with-indicator']
						: undefined
				}
				role="combobox"
				aria-autocomplete="list"
				aria-expanded={showSuggestions}
				aria-controls={showSuggestions ? listId : undefined}
				aria-activedescendant={
					showSuggestions && activeIndex >= 0
						? `${listId}-${activeIndex}`
						: undefined
				}
				aria-describedby={props['aria-describedby']}
				aria-invalid={props['aria-invalid']}
				type="search"
				autoComplete="off"
				value={value}
				placeholder={placeholder}
				disabled={disabled}
				onFocus={() => onOpenChange(true)}
				onBlur={() => onOpenChange(false)}
				onChange={(event) => {
					setActiveIndex(-1);
					onChange(event.target.value);
				}}
				onKeyDown={(event) => {
					if (event.key === 'Escape' && showSuggestions) {
						event.preventDefault();
						event.stopPropagation();
						onOpenChange(false);
					} else if (
						(event.key === 'ArrowDown' ||
							event.key === 'ArrowUp') &&
						suggestions.length > 0
					) {
						event.preventDefault();
						onOpenChange(true);
						setActiveIndex((current) => {
							if (event.key === 'ArrowDown')
								return (current + 1) % suggestions.length;
							return current <= 0
								? suggestions.length - 1
								: current - 1;
						});
					} else if (
						event.key === 'Enter' &&
						showSuggestions &&
						activeIndex >= 0
					) {
						event.preventDefault();
						select(suggestions[activeIndex]);
					} else if (
						event.key === 'Enter' &&
						showSuggestions &&
						enterSelects !== undefined
					) {
						event.preventDefault();
						select(enterSelects);
					} else if (
						event.key === 'Tab' &&
						!event.shiftKey &&
						showSuggestions &&
						tabSelects !== undefined
					) {
						select(tabSelects, false);
					}
				}}
			/>
			{indicator !== undefined && (
				<div className={styles['indicator']} aria-hidden="true">
					{indicator}
				</div>
			)}
			{showSuggestions && (
				<ul
					ref={listRef}
					id={listId}
					className={styles['suggestions']}
					role="listbox"
					aria-label={listLabel}
				>
					{suggestions.map((suggestion, index) => (
						<li
							id={`${listId}-${index}`}
							key={suggestion}
							role="option"
							aria-selected={index === activeIndex}
							className={
								index === activeIndex
									? styles['active']
									: undefined
							}
							onMouseDown={(event) => event.preventDefault()}
							onClick={() => select(suggestion)}
						>
							{suggestion}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
