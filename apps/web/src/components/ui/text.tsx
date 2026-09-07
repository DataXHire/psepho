'use client';

import React from 'react';

/**
 * Text that cannot escape its container.
 *
 * Long questions, long district names and unbreakable numbers were spilling out
 * of cards in several places. Rather than patch each one, these wrap the two
 * decisions that matter — truncate to one line, or clamp to a few — and carry
 * the full text in `title` so nothing is actually lost.
 */

type AsProp = 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5';

interface EllipsisProps extends React.HTMLAttributes<HTMLElement> {
  as?: AsProp;
  children: React.ReactNode;
  /** Full text for the tooltip when `children` is not a plain string. */
  title?: string;
}

/** One line, ellipsised, never wider than its parent. */
export const Ellipsis: React.FC<EllipsisProps> = ({
  as: Tag = 'span',
  className = '',
  children,
  title,
  ...rest
}) => (
  <Tag
    {...rest}
    title={title ?? (typeof children === 'string' ? children : undefined)}
    className={`block min-w-0 truncate ${className}`}
  >
    {children}
  </Tag>
);

interface ClampProps extends React.HTMLAttributes<HTMLElement> {
  as?: AsProp;
  /** Lines to keep before ellipsising. */
  lines?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
  title?: string;
}

const CLAMP: Record<number, string> = {
  1: 'line-clamp-1',
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
};

/** Several lines, then an ellipsis. Breaks long words rather than overflowing. */
export const Clamp: React.FC<ClampProps> = ({
  as: Tag = 'p',
  lines = 2,
  className = '',
  children,
  title,
  ...rest
}) => (
  <Tag
    {...rest}
    title={title ?? (typeof children === 'string' ? children : undefined)}
    className={`min-w-0 break-words ${CLAMP[lines]} ${className}`}
  >
    {children}
  </Tag>
);

/**
 * A label on the left and a value on the right that wraps under the label
 * instead of pushing past the edge — the pattern behind the readout rows,
 * card footers and stat lines.
 */
export const KeyValue: React.FC<{
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
  valueClassName?: string;
}> = ({ label, value, className = '', valueClassName = '' }) => (
  <div
    className={`flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 ${className}`}
  >
    <span className="min-w-0 break-words">{label}</span>
    <span className={`shrink-0 tabular-nums ${valueClassName}`}>{value}</span>
  </div>
);
