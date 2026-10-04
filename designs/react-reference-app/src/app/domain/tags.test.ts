import { describe, expect, it } from 'vitest';
import {
  isNewTag,
  resolveTag,
  tagSuggestions,
  uniqueTags,
  withTag,
  withoutTag,
} from './tags';

const VOCABULARY = ['Cycle', 'Glutes', 'Nutrition', 'Training'];

describe('resolving a typed tag', () => {
  it('trims the text and collapses inner spaces', () => {
    // arrange
    const typed = '  Meal   prep ';

    // act
    const tag = resolveTag(typed, VOCABULARY);

    // assert
    expect(tag).toBe('Meal prep');
  });

  it('resolves to the existing tag whatever casing was typed', () => {
    // arrange
    const typed = 'nUTRITION';

    // act
    const tag = resolveTag(typed, VOCABULARY);

    // assert
    expect(tag).toBe('Nutrition');
  });

  it('resolves nothing from blank text', () => {
    // arrange
    const typed = '   ';

    // act
    const tag = resolveTag(typed, VOCABULARY);

    // assert
    expect(tag).toBeNull();
  });
});

describe('holding tags', () => {
  it('never holds the same tag twice, whatever its casing', () => {
    // arrange
    const chosen = ['Training'];

    // act
    const tags = withTag(chosen, 'training');

    // assert
    expect(tags).toEqual(['Training']);
  });

  it('keeps the first casing when duplicates arrive together', () => {
    // arrange
    const typed = ['Sleep', ' sleep', 'Habits', ''];

    // act
    const tags = uniqueTags(typed);

    // assert
    expect(tags).toEqual(['Sleep', 'Habits']);
  });

  it('removes a tag regardless of casing', () => {
    // arrange
    const chosen = ['Training', 'Glutes'];

    // act
    const tags = withoutTag(chosen, 'GLUTES');

    // assert
    expect(tags).toEqual(['Training']);
  });
});

describe('suggesting tags', () => {
  it('matches part of a tag case-insensitively and leaves out chosen ones', () => {
    // arrange
    const chosen = ['Training'];

    // act
    const suggestions = tagSuggestions('TR', VOCABULARY, chosen);

    // assert
    expect(suggestions).toEqual(['Nutrition']);
  });

  it('lists tags that start with the text before tags that only contain it', () => {
    // arrange
    const vocabulary = ['Strength', 'Training', 'Travel'];

    // act
    const suggestions = tagSuggestions('tr', vocabulary, []);

    // assert
    expect(suggestions).toEqual(['Training', 'Travel', 'Strength']);
  });

  it('treats text matching an existing tag in other casing as not new', () => {
    // arrange
    const typed = 'glutes';

    // act
    const fresh = isNewTag(typed, VOCABULARY);

    // assert
    expect(fresh).toBe(false);
  });

  it('treats text matching no tag as new', () => {
    // arrange
    const typed = 'Mobility';

    // act
    const fresh = isNewTag(typed, VOCABULARY);

    // assert
    expect(fresh).toBe(true);
  });
});
