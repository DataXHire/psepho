/**
 * Whether this build is a working copy rather than the deployed product.
 *
 * `NODE_ENV` is replaced at build time, so anything behind this check is
 * removed from the production bundle entirely — the sample personas and the
 * data-mode switch cannot be reached by editing a URL or a stored value, and
 * they add nothing to what real visitors download.
 */
export const IS_DEV_BUILD = process.env.NODE_ENV !== 'production';

/** Where sample data is allowed at all. */
export type DataMode = 'live' | 'sample';

export const DEFAULT_DATA_MODE: DataMode = 'live';
