import { describe, expect, it } from 'vitest';
import { optionOrDefault } from './optionOrDefault';

const OUTCOMES = ['works', 'refuses'] as const;

describe('picking a known option', () => {
  it('keeps a value that is one of the options', () => {
    // arrange
    const value = 'refuses';

    // act
    const option = optionOrDefault(OUTCOMES, value, 'works');

    // assert
    expect(option).toBe('refuses');
  });

  it('falls back for an unknown or missing value', () => {
    // arrange
    const values = ['broken', null];

    // act
    const options = values.map((value) =>
      optionOrDefault(OUTCOMES, value, 'works'),
    );

    // assert
    expect(options).toEqual(['works', 'works']);
  });
});
