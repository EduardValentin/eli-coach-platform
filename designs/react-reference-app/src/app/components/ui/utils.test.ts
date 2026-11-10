import { describe, expect, it } from 'vitest';

import { cn } from './utils';

describe('cn enabled-only states', () => {
  it("lets a caller's hover replace the base's enabled-only hover", () => {
    // arrange
    const classes = ['not-aria-disabled:hover:bg-surface-quiet', 'hover:bg-surface-muted'];

    // act
    const merged = cn(...classes);

    // assert
    expect(merged).toBe('hover:bg-surface-muted');
  });

  it('keeps an enabled-only hover beside a rest colour', () => {
    // arrange
    const classes = ['bg-primary', 'not-aria-disabled:hover:bg-primary-hover'];

    // act
    const merged = cn(...classes);

    // assert
    expect(merged).toBe('bg-primary not-aria-disabled:hover:bg-primary-hover');
  });
});

describe('cn overlay layers', () => {
  it('lets a caller\'s z-index replace a named overlay layer', () => {
    // arrange
    const classes = ['z-sheet', 'z-sheet-overlay', 'z-floating-over-sheet', 'z-50'];

    // act
    const merged = cn(...classes);

    // assert
    expect(merged).toBe('z-50');
  });
});
