import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { Compass } from 'lucide-react';
import { BrandMark } from './BrandMark';
import { DeadEndLink, ErrorPage } from './ErrorPage';

function renderLink(direction: 'back' | 'forward') {
  render(
    <MemoryRouter>
      <DeadEndLink direction={direction} to="/somewhere">
        Take me there
      </DeadEndLink>
    </MemoryRouter>,
  );

  return screen.getByRole('link', { name: 'Take me there' });
}

describe('DeadEndLink', () => {
  it('points a back action left, before the label', () => {
    // arrange
    // act
    const link = renderLink('back');

    // assert
    expect(link).toHaveAttribute('href', '/somewhere');
    expect(link.firstElementChild).toHaveClass('lucide-arrow-left');
    expect(link.querySelector('.lucide-arrow-right')).toBeNull();
  });

  it('points a forward action right, after the label', () => {
    // arrange
    // act
    const link = renderLink('forward');

    // assert
    expect(link.lastElementChild).toHaveClass('lucide-arrow-right');
    expect(link.querySelector('.lucide-arrow-left')).toBeNull();
  });
});

describe('ErrorPage icon', () => {
  function renderPage(icon: Parameters<typeof ErrorPage>[0]['icon']) {
    render(
      <MemoryRouter>
        <ErrorPage icon={icon} title="Nothing here" description="Try later." />
      </MemoryRouter>,
    );

    return document.querySelector('[data-parity="dead-end-icon"]') as HTMLElement;
  }

  it('draws a Lucide icon at 36px inside the circle, hidden from assistive tech', () => {
    // arrange
    // act
    const circle = renderPage(Compass);

    // assert
    const icon = circle.querySelector('svg');
    expect(icon).toHaveAttribute('width', '36');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });

  it('puts a given element in the circle as it is', () => {
    // arrange
    // act
    const circle = renderPage(<BrandMark />);

    // assert
    expect(circle.querySelector('[data-parity="brand-mark"]')).not.toBeNull();
    expect(circle.querySelector('svg')).toBeNull();
  });
});
