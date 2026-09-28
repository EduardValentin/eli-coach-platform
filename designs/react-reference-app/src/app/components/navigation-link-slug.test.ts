import { describe, expect, it } from 'vitest';

import { navigationLinkSlug } from './navigation-link-slug';

describe('navigationLinkSlug', () => {
  it.each([
    ['Dashboard', 'dashboard'],
    ['Check-ins', 'checkins'],
    ['Assessment calls', 'assessment-calls'],
    ['My Plan', 'my-plan'],
  ])('turns the label %s into %s', (label, slug) => {
    // arrange
    // act
    const result = navigationLinkSlug(label);

    // assert
    expect(result).toBe(slug);
  });
});
