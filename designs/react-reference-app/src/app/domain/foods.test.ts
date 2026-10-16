import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PORTION_GRAMS,
  MAX_FOOD_NAME_LENGTH,
  MAX_MACRO_PER_100G,
  MAX_PORTION_GRAMS,
  draftProblems,
  foodFrom,
  isValidDraft,
  type FoodDraft,
} from './foods';

const chicken: FoodDraft = {
  name: 'Chicken breast',
  category: 'protein',
  icon: 'poultry',
  kcal: '165',
  protein: '31',
  carb: '0',
  fat: '3.6',
  defaultPortionGrams: '150',
  tagIds: ['mt-lunch'],
};

const draftWith = (change: Partial<FoodDraft>): FoodDraft => ({ ...chicken, ...change });

describe('the food caps', () => {
  it('allow 80 characters of name, 9,999.99 per 100 g and 99,999 g of portion, defaulting to 100 g', () => {
    // assert
    expect(MAX_FOOD_NAME_LENGTH).toBe(80);
    expect(MAX_MACRO_PER_100G).toBe(9_999.99);
    expect(MAX_PORTION_GRAMS).toBe(99_999);
    expect(DEFAULT_PORTION_GRAMS).toBe(100);
  });
});

describe('the name', () => {
  it('is missing when blank or only spaces', () => {
    // act
    const problems = draftProblems(draftWith({ name: '   ' }), []);

    // assert
    expect(problems.name).toBe('Give the food a name');
  });

  it('fits at 80 characters after trimming and is too long at 81', () => {
    // act
    const fits = draftProblems(draftWith({ name: `  ${'a'.repeat(80)}  ` }), []);
    const tooLong = draftProblems(draftWith({ name: 'a'.repeat(81) }), []);

    // assert
    expect(fits.name).toBeUndefined();
    expect(tooLong.name).toBe('Keep the name to 80 characters');
  });

  it('is taken by another active food whatever the case and surrounding spaces', () => {
    // act
    const problems = draftProblems(draftWith({ name: '  chicken BREAST ' }), [{ name: 'Chicken breast' }]);

    // assert
    expect(problems.name).toBe('A food with this name already exists');
  });

  it('is free when only an archived food holds it', () => {
    // act
    const problems = draftProblems(chicken, [{ name: 'Chicken breast', archivedAt: '2026-09-28T10:00:00.000Z' }]);

    // assert
    expect(problems.name).toBeUndefined();
  });
});

describe('a macro per 100 g', () => {
  it.each(['kcal', 'protein', 'carb', 'fat'] as const)('%s accepts blank, 0, 1.23 and 9,999.99', (macro) => {
    // act
    const accepted = ['', '0', '1.23', '9999.99'].map((value) => draftProblems(draftWith({ [macro]: value }), [])[macro]);

    // assert
    expect(accepted).toEqual([undefined, undefined, undefined, undefined]);
  });

  it.each(['kcal', 'protein', 'carb', 'fat'] as const)('%s refuses a negative, 10,000 and three decimals', (macro) => {
    // act
    const refused = ['-1', '10000', '1.234'].map((value) => draftProblems(draftWith({ [macro]: value }), [])[macro]);

    // assert
    expect(refused).toEqual(Array(3).fill('Enter a value from 0 to 9,999.99'));
  });
});

describe('the default portion', () => {
  it('accepts blank, 0, 1 and 99,999 grams', () => {
    // act
    const accepted = ['', '0', '1', '99999'].map(
      (value) => draftProblems(draftWith({ defaultPortionGrams: value }), []).defaultPortionGrams,
    );

    // assert
    expect(accepted).toEqual([undefined, undefined, undefined, undefined]);
  });

  it('refuses a fraction, a negative and 100,000 grams', () => {
    // act
    const refused = ['0.5', '-1', '100000'].map(
      (value) => draftProblems(draftWith({ defaultPortionGrams: value }), []).defaultPortionGrams,
    );

    // assert
    expect(refused).toEqual(Array(3).fill('Enter whole grams up to 99,999'));
  });
});

describe('isValidDraft', () => {
  it('holds only while no problem does', () => {
    // act
    const valid = isValidDraft(draftProblems(chicken, []));
    const invalid = isValidDraft(draftProblems(draftWith({ name: '' }), []));

    // assert
    expect(valid).toBe(true);
    expect(invalid).toBe(false);
  });
});

describe('foodFrom', () => {
  it('trims the name, reads blank macros as 0 and a blank or zero portion as 100 g', () => {
    // act
    const blank = foodFrom(draftWith({ name: '  Tofu ', kcal: '', protein: '17', carb: ' ', fat: '9.5', defaultPortionGrams: '' }));
    const zero = foodFrom(draftWith({ defaultPortionGrams: '0' }));

    // assert
    expect(blank).toEqual({
      name: 'Tofu',
      category: 'protein',
      icon: 'poultry',
      kcal: 0,
      protein: 17,
      carb: 0,
      fat: 9.5,
      defaultPortionGrams: 100,
      tagIds: ['mt-lunch'],
    });
    expect(zero.defaultPortionGrams).toBe(100);
  });
});
