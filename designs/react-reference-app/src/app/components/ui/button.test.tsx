import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button, buttonVariants } from './button';

describe('buttonVariants', () => {
  it('gives every button the 48px tap area around its own box', () => {
    // arrange
    // act
    const classes = buttonVariants().split(' ');

    // assert
    expect(classes).toEqual(expect.arrayContaining(['relative', 'hit-area']));
  });

  it('draws a small primary button at medium weight by default', () => {
    // arrange
    // act
    const classes = buttonVariants().split(' ');

    // assert
    expect(classes).toEqual(
      expect.arrayContaining(['bg-primary', 'h-(--size-control-sm)', 'px-4', 'text-sm', 'font-medium']),
    );
  });

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

  it('lets the medium grow size wrap its label and outgrow its minimum height', () => {
    // arrange
    // act
    const classes = buttonVariants({ size: 'md-grow' }).split(' ');

    // assert
    expect(classes).toEqual(
      expect.arrayContaining([
        'min-h-(--size-control-md)',
        'px-5',
        'text-base',
        'whitespace-normal',
      ]),
    );
    expect(classes).not.toContain('h-(--size-control-md)');
    expect(classes).not.toContain('whitespace-nowrap');
  });

  it('sizes an unsized icon to 16px in the compact sizes and leaves it alone in the large ones', () => {
    // arrange
    const iconDefault = "[&_svg:not([class*='size-'])]:size-4";
    const compact = ['xs', 'sm', 'md', 'inline', 'icon-xs', 'icon-sm'] as const;
    const large = ['md-wide', 'md-grow', 'lg', 'lg-tight', 'xl'] as const;

    // act
    const compactClasses = compact.map((size) => buttonVariants({ size }).split(' '));
    const largeClasses = large.map((size) => buttonVariants({ size }).split(' '));

    // assert
    for (const classes of compactClasses) expect(classes).toContain(iconDefault);
    for (const classes of largeClasses) expect(classes).not.toContain(iconDefault);
  });

  it('sizes an unsized icon to 20px in the medium icon size', () => {
    // arrange
    // act
    const classes = buttonVariants({ size: 'icon-md' }).split(' ');

    // assert
    expect(classes).toEqual(
      expect.arrayContaining(['size-(--size-control-md)', 'rounded-full', "[&_svg:not([class*='size-'])]:size-5"]),
    );
    expect(classes).not.toContain("[&_svg:not([class*='size-'])]:size-4");
  });

  it('lets the text size override the size’s own text size', () => {
    // arrange
    // act
    const classes = buttonVariants({ size: 'xl', textSize: 'sm' }).split(' ');

    // assert
    expect(classes).toContain('text-sm');
    expect(classes).not.toContain('text-lg');
  });

  it('sets the label weight and lettering when asked', () => {
    // arrange
    // act
    const classes = buttonVariants({ weight: 'semibold', lettering: 'caps' }).split(' ');

    // assert
    expect(classes).toEqual(expect.arrayContaining(['font-semibold', 'uppercase', 'tracking-widest']));
    expect(classes).not.toContain('font-medium');
  });

  it('fills the row below the small breakpoint only when asked', () => {
    // arrange
    // act
    const classes = buttonVariants({ width: 'full-below-sm' }).split(' ');

    // assert
    expect(classes).toEqual(expect.arrayContaining(['w-full', 'sm:w-auto']));
  });

  it('rests a card elevation button on the card shadow without a hover lift', () => {
    // arrange
    // act
    const classes = buttonVariants({ elevation: 'card' }).split(' ');

    // assert
    expect(classes).toContain('shadow-card');
    expect(classes.some((name) => name.startsWith('hover:shadow'))).toBe(false);
  });

  it('lifts a raised button and scales it down while pressed', () => {
    // arrange
    // act
    const classes = buttonVariants({ elevation: 'raised', press: 'scale' }).split(' ');

    // assert
    expect(classes).toEqual(
      expect.arrayContaining([
        'shadow-action',
        'not-aria-disabled:hover:shadow-action-hover',
        'motion-safe:not-aria-disabled:active:scale-[0.98]',
      ]),
    );
  });

  it('fills an ink button with the foreground and turns it brand on hover', () => {
    // arrange
    // act
    const classes = buttonVariants({ variant: 'ink' }).split(' ');

    // assert
    expect(classes).toEqual(
      expect.arrayContaining(['bg-foreground', 'text-background', 'not-aria-disabled:hover:bg-brand']),
    );
  });

  it('fills an on-brand button with the card surface and brand text', () => {
    // arrange
    // act
    const classes = buttonVariants({ variant: 'on-brand' }).split(' ');

    // assert
    expect(classes).toEqual(
      expect.arrayContaining(['bg-card', 'text-brand', 'not-aria-disabled:hover:bg-surface-subtle']),
    );
  });

  it('frosts a glass button over a photo', () => {
    // arrange
    // act
    const classes = buttonVariants({ variant: 'glass' }).split(' ');

    // assert
    expect(classes).toEqual(
      expect.arrayContaining(['backdrop-blur-sm', 'text-surface-inverted-foreground']),
    );
  });

  it('draws a disclosure toggle at regular weight', () => {
    // arrange
    // act
    const classes = buttonVariants({ variant: 'disclosure' }).split(' ');

    // assert
    expect(classes).toContain('font-normal');
    expect(classes).not.toContain('font-medium');
  });

  it('keeps a medium drop slot’s text small', () => {
    // arrange
    // act
    const classes = buttonVariants({ variant: 'drop', size: 'md' }).split(' ');

    // assert
    expect(classes).toEqual(expect.arrayContaining(['border-dashed', 'w-full', 'text-sm']));
    expect(classes).not.toContain('text-base');
  });

  it('appends the caller’s classes last', () => {
    // arrange
    // act
    const classes = buttonVariants({ className: 'mt-6 font-semibold' }).split(' ');

    // assert
    expect(classes).toEqual(expect.arrayContaining(['mt-6', 'font-semibold']));
    expect(classes).not.toContain('font-medium');
  });
});

describe('Button', () => {
  it('marks the rendered button as the button slot', () => {
    // arrange
    // act
    render(<Button>Continue</Button>);

    // assert
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveAttribute('data-slot', 'button');
  });

  it('draws the chosen variant and size on the rendered button', () => {
    // arrange
    // act
    render(<Button variant="inverted" size="lg">Continue</Button>);

    // assert
    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button.className).toContain('bg-surface-inverted');
    expect(button.className).toContain('h-(--size-control-lg)');
  });

  it('lends its look to its only child when rendered as a child', () => {
    // arrange
    // act
    render(
      <Button asChild variant="outline">
        <a href="/store">Back to the store</a>
      </Button>,
    );

    // assert
    const link = screen.getByRole('link', { name: 'Back to the store' });
    expect(link.className).toContain('border-control-border-soft');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
