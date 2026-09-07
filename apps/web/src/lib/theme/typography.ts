/** Font stacks and the named type scale, mirrored into Tailwind. */

export const fontStacks: Record<'display' | 'body', string[]> = {
  display: ["'Bricolage Grotesque'", 'sans-serif'],
  body: ["'Inter'", 'sans-serif'],
};

type SizeSpec = [string, { lineHeight: string; letterSpacing?: string; fontWeight?: string }];

export const typeScale: Record<string, SizeSpec> = {
  'display-lg': ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '800' }],
  'display-lg-mobile': ['36px', { lineHeight: '42px', letterSpacing: '-0.02em', fontWeight: '800' }],
  'headline-lg': ['32px', { lineHeight: '40px', fontWeight: '700' }],
  'headline-lg-mobile': ['28px', { lineHeight: '36px', fontWeight: '700' }],
  'headline-md': ['24px', { lineHeight: '32px', fontWeight: '700' }],
  'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
  'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
  'label-bold': ['14px', { lineHeight: '20px', letterSpacing: '0.01em', fontWeight: '600' }],
  caption: ['12px', { lineHeight: '16px', fontWeight: '500' }],
};

/** Families the named sizes are paired with in Tailwind's `fontFamily`. */
export const fontFamilies: Record<string, string[]> = {
  display: fontStacks.display,
  'display-lg': fontStacks.display,
  'display-lg-mobile': fontStacks.display,
  'headline-lg': fontStacks.display,
  'headline-md': fontStacks.display,
  body: fontStacks.body,
  'body-lg': fontStacks.body,
  'body-md': fontStacks.body,
  'label-bold': fontStacks.body,
  caption: fontStacks.body,
};
