import { screen, within } from '@testing-library/react';
import { Route } from 'react-router';
import { describe, expect, it } from 'vitest';
import { renderPortalRoute } from '../../test/renderPortalRoute';
import { stubIntersectionObserver } from '../../test/stubIntersectionObserver';
import { FooterCTA } from './FooterCTA';

describe('the footer call to action', () => {
  stubIntersectionObserver();

  it('is a named landmark holding the closing calls to action', async () => {
    // arrange
    // act
    renderPortalRoute('/', <Route path="/" element={<FooterCTA />} />);

    // assert
    const landmark = await screen.findByRole('region', { name: 'Start your next step' });
    expect(within(landmark).getByRole('link', { name: 'Browse the free resources' })).toBeInTheDocument();
    expect(within(landmark).getByRole('link', { name: 'See coaching plans' })).toBeInTheDocument();
  });
});
