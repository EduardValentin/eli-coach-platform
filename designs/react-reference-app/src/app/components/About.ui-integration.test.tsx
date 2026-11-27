import { screen, within } from '@testing-library/react';
import { Route } from 'react-router';
import { describe, expect, it } from 'vitest';
import { renderPortalRoute } from '../../test/renderPortalRoute';
import { stubIntersectionObserver } from '../../test/stubIntersectionObserver';
import { About } from './About';

describe('the about section', () => {
  stubIntersectionObserver();

  it('reads the three credentials as a named list', async () => {
    // arrange
    // act
    renderPortalRoute('/', <Route path="/" element={<About />} />);

    // assert
    const credentials = await screen.findByRole('list', { name: "Eli's credentials and coaching focus" });
    const items = within(credentials).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('IFBB Certified Trainer');
    expect(items[1]).toHaveTextContent('Certified Nutritionist');
    expect(items[2]).toHaveTextContent('Women Focused');
  });

  it('presents the portrait as a figure', async () => {
    // arrange
    // act
    renderPortalRoute('/', <Route path="/" element={<About />} />);

    // assert
    const portrait = await screen.findByRole('img', { name: /Eli, personal trainer/ });
    expect(screen.getByRole('figure')).toContainElement(portrait);
  });
});
