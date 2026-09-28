import { describe, expect, it } from 'vitest';
import type { JourneyGender } from './journey';
import { copyForGender, formsForGender } from './onboardingSchema';

function formIdsFor(gender: JourneyGender): string[] {
  return formsForGender(gender).map((form) => form.id);
}

describe('the forms a client completes', () => {
  it('asks a female client about her cycle in five forms', () => {
    // arrange
    const gender = 'female';

    // act
    const formIds = formIdsFor(gender);

    // assert
    expect(formIds).toEqual([
      'goal-availability',
      'safety-screening',
      'cycle-context',
      'nutrition-lifestyle',
      'measurements',
    ]);
  });

  it('leaves the cycle out for a male client', () => {
    // arrange
    const gender = 'male';

    // act
    const formIds = formIdsFor(gender);

    // assert
    expect(formIds).toHaveLength(4);
    expect(formIds).not.toContain('cycle-context');
  });

  it('leaves the cycle out for a client who prefers not to say', () => {
    // arrange
    const gender = 'prefer-not-to-say';

    // act
    const formIds = formIdsFor(gender);

    // assert
    expect(formIds).toHaveLength(4);
    expect(formIds).not.toContain('cycle-context');
  });
});

describe('copy that depends on her gender', () => {
  const copy = { female: 'health and cycle', other: 'health' };

  it('mentions the cycle only for a female client', () => {
    // arrange
    const gender = 'female';

    // act
    const text = copyForGender(copy, gender);

    // assert
    expect(text).toBe('health and cycle');
  });

  it('uses the other wording for a client who prefers not to say', () => {
    // arrange
    const gender = 'prefer-not-to-say';

    // act
    const text = copyForGender(copy, gender);

    // assert
    expect(text).toBe('health');
  });
});
