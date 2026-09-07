'use client';

import React from 'react';

/* -------------------------------------------------------------------------
 * Small building blocks shared across the app. Each one exists because the
 * same markup was otherwise repeated in three or more places.
 * ---------------------------------------------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type ButtonSize = 'sm' | 'md';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary/90 shadow-xs',
  secondary: 'bg-secondary text-on-secondary hover:bg-secondary/90 shadow-xs',
  ghost: 'text-primary hover:bg-primary/10',
  outline:
    'bg-surface-container-lowest text-primary border border-primary/25 hover:bg-primary/10 hover:border-primary/40',
  danger: 'bg-error/10 text-error border border-error/25 hover:bg-error/20',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-[11px] gap-1',
  md: 'px-4 py-2 text-xs gap-1.5',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  full?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  full,
  className = '',
  children,
  ...rest
}) => (
  <button
    type="button"
    {...rest}
    className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full font-label-bold transition-all duration-150 active:scale-95 disabled:pointer-events-none disabled:opacity-45 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
      BUTTON_VARIANTS[variant]
    } ${BUTTON_SIZES[size]} ${full ? 'w-full' : ''} ${className}`}
  >
    {icon && <span className="material-symbols-outlined text-sm">{icon}</span>}
    {children}
  </button>
);

export const IconButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; label: string }
> = ({ icon, label, className = '', ...rest }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    {...rest}
    className={`rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${className}`}
  >
    <span className="material-symbols-outlined text-lg">{icon}</span>
  </button>
);

export const Card: React.FC<
  React.HTMLAttributes<HTMLDivElement> & { as?: 'div' | 'article' | 'section'; pad?: 'sm' | 'md' | 'lg' }
> = ({ as: Tag = 'div', pad = 'md', className = '', children, ...rest }) => {
  const padding = pad === 'sm' ? 'p-4' : pad === 'lg' ? 'p-6 md:p-8' : 'p-6';
  return (
    <Tag
      {...rest}
      className={`rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-xs ${padding} ${className}`}
    >
      {children}
    </Tag>
  );
};

type ChipTone = 'primary' | 'secondary' | 'tertiary' | 'neutral' | 'success';

const CHIP_TONES: Record<ChipTone, string> = {
  primary: 'bg-primary/10 text-primary border-primary/20',
  secondary: 'bg-secondary/10 text-secondary border-secondary/20',
  tertiary: 'bg-tertiary-container/10 text-tertiary border-tertiary/20',
  neutral: 'bg-surface-container-low text-on-surface-variant border-outline-variant/25',
  success: 'bg-secondary/10 text-on-secondary-container border-secondary/25',
};

export const Chip: React.FC<{
  tone?: ChipTone;
  icon?: string;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ tone = 'neutral', icon, dot, className = '', children }) => (
  <span
    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-label-bold text-[11px] ${CHIP_TONES[tone]} ${className}`}
  >
    {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />}
    {icon && <span className="material-symbols-outlined text-sm">{icon}</span>}
    {children}
  </span>
);

/** A horizontal bar showing one value out of 100. */
export const Meter: React.FC<{
  value: number;
  colour?: string;
  height?: number;
  className?: string;
  label?: string;
}> = ({ value, colour, height = 6, className = '', label }) => (
  <div
    className={`w-full overflow-hidden rounded-full bg-surface-container-high ${className}`}
    style={{ height }}
    role="meter"
    aria-valuenow={Math.round(value)}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-label={label}
  >
    <div
      className="h-full rounded-full transition-[width] duration-500"
      style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: colour }}
    />
  </div>
);

export const SectionHeading: React.FC<{ title: string; hint?: string; className?: string }> = ({
  title,
  hint,
  className = '',
}) => (
  <div
    className={`mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-outline-variant/20 pb-2 ${className}`}
  >
    <h3 className="font-label-bold text-label-bold uppercase tracking-wider text-on-surface-variant">
      {title}
    </h3>
    {hint && <span className="text-[11px] text-outline-variant">{hint}</span>}
  </div>
);

export const SearchField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}> = ({ value, onChange, placeholder = 'Search debates', className = '', ariaLabel }) => (
  <div className={`relative ${className}`}>
    <span
      className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-base text-on-surface-variant"
      aria-hidden="true"
    >
      search
    </span>
    <input
      type="search"
      value={value}
      aria-label={ariaLabel ?? placeholder}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-full border border-outline-variant/40 bg-surface-container-lowest py-1.5 pl-8 pr-7 text-xs text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
    />
    {value && (
      <button
        type="button"
        aria-label="Clear search"
        onClick={() => onChange('')}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-on-surface-variant hover:text-primary"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    )}
  </div>
);

/** Shown where a filtered list came back empty. */
export const EmptyState: React.FC<{
  icon?: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
}> = ({ icon = 'inbox', title, body, action }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant/40 bg-surface-container-low/60 px-6 py-12 text-center">
    <span className="material-symbols-outlined mb-2 text-4xl text-outline-variant">{icon}</span>
    <h4 className="font-headline-md text-base text-on-surface">{title}</h4>
    {body && <p className="mt-1 max-w-sm text-xs text-on-surface-variant">{body}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
