import { screen, within } from '@testing-library/react';
import { Route } from 'react-router';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderPortalRoute } from '../../test/renderPortalRoute';
import { About } from './About';
import { Hero } from './Hero';

class IntersectionObserverStub {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

describe('the home page calls to book a call', () => {
  beforeAll(() => {
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('offers the hero call as one link to the booking page', async () => {
    // arrange
    // act
    renderPortalRoute('/', <Route path="/" element={<Hero />} />);

    // assert
    const link = await screen.findByRole('link', { name: /See if we’re a fit/ });
    expect(link).toHaveAttribute('href', '/book');
    expect(within(link).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /See if we’re a fit/ })).not.toBeInTheDocument();
  });

  it('offers the about section call as one link to the booking page', async () => {
    // arrange
    // act
    renderPortalRoute('/', <Route path="/" element={<About />} />);

    // assert
    const link = await screen.findByRole('link', { name: 'Book a free call' });
    expect(link).toHaveAttribute('href', '/book');
    expect(within(link).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Book a free call' })).not.toBeInTheDocument();
  });
});
