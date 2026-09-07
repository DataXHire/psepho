'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
  /** Optional second line, e.g. what the choice does. */
  hint?: string;
  /** Optional trailing count, e.g. how many polls match. */
  count?: number;
  disabled?: boolean;
}

interface DropdownProps<T extends string> {
  value: T;
  options: ReadonlyArray<DropdownOption<T>>;
  onChange: (value: T) => void;
  /** Shown before the selected label, e.g. "Topic". */
  label?: string;
  /** Screen-reader name when no visible label is given. */
  ariaLabel?: string;
  placeholder?: string;
  size?: 'sm' | 'md';
  align?: 'left' | 'right';
  className?: string;
  icon?: string;
}

/**
 * The app's one dropdown.
 *
 * A native `<select>` cannot be themed to match the surrounding surfaces, so
 * this is a listbox built from the same tokens as everything else. It keeps the
 * keyboard contract a `<select>` has: arrows move, Home/End jump, typing jumps
 * to a match, Enter picks, Escape closes and returns focus to the trigger.
 */
export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  label,
  ariaLabel,
  placeholder = 'Select',
  size = 'md',
  align = 'left',
  className = '',
  icon,
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const typeahead = useRef({ query: '', at: 0 });
  const listId = `dropdown-${useId().replace(/:/g, '')}`;

  // An unmatched value means nothing is chosen yet: show the placeholder
  // rather than the first option, which reads as an answer the viewer gave.
  const selectedIndex = useMemo(
    () => options.findIndex((o) => o.value === value),
    [options, value]
  );
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const close = useCallback(
    (returnFocus = true) => {
      setOpen(false);
      if (returnFocus) triggerRef.current?.focus();
    },
    []
  );

  // Open at the current selection, and keep the active row in view.
  useEffect(() => {
    if (open) setActiveIndex(Math.max(0, selectedIndex));
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({
      block: 'nearest',
    });
  }, [open, activeIndex]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const commit = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    close();
  };

  const step = (delta: number) => {
    setActiveIndex((current) => {
      let next = current;
      for (let i = 0; i < options.length; i += 1) {
        next = (next + delta + options.length) % options.length;
        if (!options[next].disabled) return next;
      }
      return current;
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        step(event.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      case 'Home':
      case 'End': {
        if (!open) return;
        event.preventDefault();
        setActiveIndex(event.key === 'Home' ? 0 : options.length - 1);
        return;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        if (open) commit(activeIndex);
        else setOpen(true);
        return;
      }
      case 'Escape': {
        if (!open) return;
        event.preventDefault();
        close();
        return;
      }
      case 'Tab': {
        if (open) setOpen(false);
        return;
      }
      default:
        break;
    }

    if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return;
    const now = Date.now();
    typeahead.current.query =
      now - typeahead.current.at > 700 ? event.key : typeahead.current.query + event.key;
    typeahead.current.at = now;
    const query = typeahead.current.query.toLowerCase();
    const match = options.findIndex(
      (o) => !o.disabled && o.label.toLowerCase().startsWith(query)
    );
    if (match >= 0) {
      setOpen(true);
      setActiveIndex(match);
    }
  };

  const pad = size === 'sm' ? 'py-1 pl-2.5 pr-1.5 text-[11px]' : 'py-1.5 pl-3 pr-2 text-xs';

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        className={`inline-flex w-full items-center gap-1.5 rounded-full border bg-surface-container-lowest font-label-bold transition-colors ${pad} ${
          open
            ? 'border-primary text-primary shadow-xs'
            : 'border-outline-variant/40 text-on-surface hover:border-primary/50 hover:text-primary'
        } focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`}
      >
        {icon && (
          <span className="material-symbols-outlined text-sm text-primary shrink-0">{icon}</span>
        )}
        {label && <span className="text-on-surface-variant font-medium shrink-0">{label}</span>}
        <span
          className={`min-w-0 flex-1 truncate text-left ${
            selected ? '' : 'font-normal text-outline'
          }`}
        >
          {selected?.label ?? placeholder}
        </span>
        <span
          className={`material-symbols-outlined text-base shrink-0 text-on-surface-variant transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={`${listId}-${activeIndex}`}
          onKeyDown={handleKeyDown}
          className={`scroll-inset absolute z-50 mt-1.5 max-h-64 w-max min-w-full max-w-[min(20rem,calc(100vw-2rem))] overflow-y-auto overflow-x-hidden rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-1 shadow-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;
            return (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                data-active={isActive}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commit(index)}
                className={`flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                  option.disabled
                    ? 'cursor-not-allowed text-outline'
                    : isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-on-surface'
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className={`block truncate ${isSelected ? 'font-bold' : ''}`}>
                    {option.label}
                  </span>
                  {option.hint && (
                    <span className="block truncate text-[10px] text-on-surface-variant">
                      {option.hint}
                    </span>
                  )}
                </span>
                {typeof option.count === 'number' && (
                  <span className="shrink-0 tabular-nums text-[10px] text-on-surface-variant">
                    {option.count}
                  </span>
                )}
                {isSelected && (
                  <span
                    className="material-symbols-outlined shrink-0 text-sm text-primary"
                    aria-hidden="true"
                  >
                    check
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
