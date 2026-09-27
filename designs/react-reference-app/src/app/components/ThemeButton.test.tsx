import { describe, expect, it } from 'vitest';
import { buttonVariants } from './ThemeButton';

describe('buttonVariants', () => {
  it('rounds a button to the field corner by default', () => {
    // arrange
    // act
    const classes = buttonVariants().split(' ');

    // assert
    expect(classes).toContain('rounded-field');
  });

  it('rounds a button to the control corner when asked', () => {
    // arrange
    // act
    const classes = buttonVariants({ corner: 'control' }).split(' ');

    // assert
    expect(classes).toContain('rounded-control');
    expect(classes).not.toContain('rounded-field');
  });

  it('gives the extra large size its height, padding and text size', () => {
    // arrange
    // act
    const classes = buttonVariants({ size: 'xl' }).split(' ');

    // assert
    expect(classes).toEqual(
      expect.arrayContaining(['h-(--size-control-xl)', 'px-12', 'text-lg']),
    );
  });

  it('keeps the wide medium size padding beside an icon', () => {
    // arrange
    // act
    const classes = buttonVariants({ size: 'md-wide' }).split(' ');

    // assert
    expect(classes).toEqual(
      expect.arrayContaining(['h-(--size-control-md)', 'px-6', 'text-base']),
    );
    expect(classes.some((name) => name.startsWith('has-'))).toBe(false);
  });

  it('fills an ink button with the foreground and turns it brand on hover', () => {
    // arrange
    // act
    const classes = buttonVariants({ variant: 'ink' }).split(' ');

    // assert
    expect(classes).toEqual(
      expect.arrayContaining(['bg-foreground', 'text-background', 'hover:bg-brand']),
    );
  });

  it('fills an on-brand button with the card surface and brand text', () => {
    // arrange
    // act
    const classes = buttonVariants({ variant: 'on-brand' }).split(' ');

    // assert
    expect(classes).toEqual(
      expect.arrayContaining(['bg-card', 'text-brand', 'hover:bg-surface-subtle']),
    );
  });
});
