import React from 'react';

/** The Athenian voting pebble the product is named after. */
export const BrandMark: React.FC<{ size?: number; className?: string }> = ({
  size = 24,
  className = 'text-primary',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M12 3C6.48 3 2.5 7.5 2.5 12.5C2.5 17.5 7 21 12 21C17.5 21 21.5 17 21.5 12C21.5 7 17.5 3 12 3Z"
      fill="currentColor"
      opacity="0.9"
    />
    <circle cx="9" cy="10" r="1.5" fill="#00f4fe" />
  </svg>
);
