import { describe, expect, it } from 'vitest';
import {
  MAX_INGREDIENT_GRAMS,
  MAX_INSTRUCTIONS_LENGTH,
  MAX_RECIPE_MINUTES,
  MAX_RECIPE_NAME_LENGTH,
  MIN_INGREDIENT_GRAMS,
  RECIPE_PHOTO_MAX_BYTES,
  computeRecipeMacros,
  draftProblems,
  isValidDraft,
  recipeFrom,
  recipePhotoContentRefusal,
  recipePhotoRefusal,
  type RecipeDraft,
} from './recipes';

const bowl: RecipeDraft = {
  name: 'Chicken rice bowl',
  ingredients: [
    { foodId: 'food-chicken', grams: '150', method: 'grilled' },
    { foodId: 'food-white-rice', grams: '150', method: 'boiled' },
  ],
  prepMinutes: '10',
  cookMinutes: '20',
  instructions: 'Grill the chicken and boil the rice.',
  mealRoleIds: ['mt-lunch'],
  tagIds: ['nu-iron'],
  icon: 'poultry',
};

const draftWith = (change: Partial<RecipeDraft>): RecipeDraft => ({ ...bowl, ...change });

const gramsProblems = (grams: string[]) =>
  grams.map(
    (value) =>
      draftProblems(draftWith({ ingredients: [{ foodId: 'food-chicken', grams: value, method: 'raw' }] }), [])
        .ingredients?.[0],
  );

describe('the recipe caps', () => {
  it('allow 80 characters of name, 1 to 99,999 grams per ingredient, 9,999 minutes and 2,000 characters of instructions', () => {
    // assert
    expect(MAX_RECIPE_NAME_LENGTH).toBe(80);
    expect(MIN_INGREDIENT_GRAMS).toBe(1);
    expect(MAX_INGREDIENT_GRAMS).toBe(99_999);
    expect(MAX_RECIPE_MINUTES).toBe(9_999);
    expect(MAX_INSTRUCTIONS_LENGTH).toBe(2_000);
  });
});

describe('the recipe name', () => {
  it('is missing when blank or only spaces', () => {
    // act
    const problems = draftProblems(draftWith({ name: '   ' }), []);

    // assert
    expect(problems.name).toBe('Give the recipe a name');
  });

  it('fits at 80 characters after trimming and is too long at 81', () => {
    // act
    const fits = draftProblems(draftWith({ name: `  ${'a'.repeat(80)}  ` }), []);
    const tooLong = draftProblems(draftWith({ name: 'a'.repeat(81) }), []);

    // assert
    expect(fits.name).toBeUndefined();
    expect(tooLong.name).toBe('Keep the name to 80 characters');
  });

  it('is taken by another active recipe whatever the case and surrounding spaces', () => {
    // act
    const problems = draftProblems(draftWith({ name: '  chicken RICE bowl ' }), [{ name: 'Chicken rice bowl' }]);

    // assert
    expect(problems.name).toBe('A recipe with this name already exists');
  });

  it('is free when only an archived recipe holds it', () => {
    // act
    const problems = draftProblems(bowl, [{ name: 'Chicken rice bowl', archivedAt: '2026-09-28T10:00:00.000Z' }]);

    // assert
    expect(problems.name).toBeUndefined();
  });
});

describe('the grams of an ingredient', () => {
  it('accept whole grams at 1 and at 99,999', () => {
    // act
    const accepted = gramsProblems(['1', '99999']);

    // assert
    expect(accepted).toEqual([undefined, undefined]);
  });

  it('refuse blank, 0, a fraction, a negative and 100,000 grams', () => {
    // act
    const refused = gramsProblems(['', '0', '1.5', '-1', '100000']);

    // assert
    expect(refused).toEqual(Array(5).fill('Enter whole grams from 1 to 99,999'));
  });

  it('are refused at their own position only', () => {
    // act
    const problems = draftProblems(
      draftWith({
        ingredients: [
          { foodId: 'food-chicken', grams: '150', method: 'raw' },
          { foodId: 'food-chicken', grams: '0', method: 'raw' },
        ],
      }),
      [],
    );

    // assert
    expect(problems.ingredients).toEqual([undefined, 'Enter whole grams from 1 to 99,999']);
  });

  it('leave no ingredient problem when every ingredient fits or there is none', () => {
    // act
    const fitting = draftProblems(bowl, []);
    const empty = draftProblems(draftWith({ ingredients: [] }), []);

    // assert
    expect(fitting.ingredients).toBeUndefined();
    expect(empty).toEqual({});
  });
});

describe('the prep and cook minutes', () => {
  it.each(['prepMinutes', 'cookMinutes'] as const)('%s accept blank, 0 and 9,999', (field) => {
    // act
    const accepted = ['', '0', '9999'].map((value) => draftProblems(draftWith({ [field]: value }), [])[field]);

    // assert
    expect(accepted).toEqual([undefined, undefined, undefined]);
  });

  it.each(['prepMinutes', 'cookMinutes'] as const)('%s refuse 10,000, a fraction and a negative', (field) => {
    // act
    const refused = ['10000', '2.5', '-1'].map((value) => draftProblems(draftWith({ [field]: value }), [])[field]);

    // assert
    expect(refused).toEqual(Array(3).fill('Enter whole minutes up to 9,999'));
  });
});

describe('the instructions', () => {
  it('fit at 2,000 characters after trimming and are too long at 2,001', () => {
    // act
    const fits = draftProblems(draftWith({ instructions: ` ${'a'.repeat(2_000)} ` }), []);
    const tooLong = draftProblems(draftWith({ instructions: 'a'.repeat(2_001) }), []);

    // assert
    expect(fits.instructions).toBeUndefined();
    expect(tooLong.instructions).toBe('Keep the instructions to 2,000 characters');
  });
});

describe('isValidDraft', () => {
  it('holds only while no problem does', () => {
    // act
    const valid = isValidDraft(draftProblems(bowl, []));
    const invalid = isValidDraft(
      draftProblems(draftWith({ ingredients: [{ foodId: 'food-chicken', grams: '0', method: 'raw' }] }), []),
    );

    // assert
    expect(valid).toBe(true);
    expect(invalid).toBe(false);
  });
});

describe('recipeFrom', () => {
  it('trims the name and instructions, reads the grams and minutes as numbers and blank minutes as 0', () => {
    // act
    const recipe = recipeFrom(
      draftWith({ name: '  Bowl ', instructions: ' Stir. ', prepMinutes: '', cookMinutes: '7' }),
    );

    // assert
    expect(recipe).toEqual({
      name: 'Bowl',
      ingredients: [
        { foodId: 'food-chicken', grams: 150, method: 'grilled' },
        { foodId: 'food-white-rice', grams: 150, method: 'boiled' },
      ],
      prepMinutes: 0,
      cookMinutes: 7,
      instructions: 'Stir.',
      mealRoleIds: ['mt-lunch'],
      tagIds: ['nu-iron'],
      icon: 'poultry',
    });
  });
});

describe('computeRecipeMacros', () => {
  const chicken = { id: 'food-chicken', kcal: 165, protein: 31, carb: 0, fat: 3.6 };
  const rice = { id: 'food-white-rice', kcal: 130, protein: 2.7, carb: 28, fat: 0.3 };
  const turmeric = { id: 'food-turmeric', kcal: 0, protein: 0, carb: 0, fat: 0 };

  it('sums each food per 100 g scaled by its grams and rounds each total to a whole number', () => {
    // act
    const macros = computeRecipeMacros(
      [
        { foodId: 'food-chicken', grams: 150 },
        { foodId: 'food-white-rice', grams: 150 },
      ],
      [chicken, rice],
    );

    // assert
    expect(macros).toEqual({ kcal: 443, protein: 51, carb: 42, fat: 6 });
  });

  it('counts the same food twice when it is added twice', () => {
    // act
    const macros = computeRecipeMacros(
      [
        { foodId: 'food-chicken', grams: 100 },
        { foodId: 'food-chicken', grams: 50 },
      ],
      [chicken],
    );

    // assert
    expect(macros).toEqual({ kcal: 248, protein: 47, carb: 0, fat: 5 });
  });

  it('adds nothing for a food with no energy or macros', () => {
    // act
    const macros = computeRecipeMacros(
      [
        { foodId: 'food-chicken', grams: 100 },
        { foodId: 'food-turmeric', grams: 2 },
      ],
      [chicken, turmeric],
    );

    // assert
    expect(macros).toEqual({ kcal: 165, protein: 31, carb: 0, fat: 4 });
  });

  it('is zero for a recipe with no ingredients', () => {
    // act
    const macros = computeRecipeMacros([], [chicken]);

    // assert
    expect(macros).toEqual({ kcal: 0, protein: 0, carb: 0, fat: 0 });
  });
});

describe('a recipe photo chosen in the browser', () => {
  it.each([
    ['a JPEG', 'bowl.jpg', 'image/jpeg'],
    ['a PNG', 'bowl.png', 'image/png'],
    ['a WebP', 'bowl.webp', 'image/webp'],
    ['a .jpeg the file manager gave no type', 'bowl.JPEG', ''],
  ])('accepts %s', (_kind, name, type) => {
    // arrange
    const file = { name, type, size: 1_024 };

    // act
    const refusal = recipePhotoRefusal(file);

    // assert
    expect(refusal).toBeUndefined();
  });

  it('refuses another kind of file, naming it', () => {
    // arrange
    const file = { name: 'bowl.heic', type: 'image/heic', size: 1_024 };

    // act
    const refusal = recipePhotoRefusal(file);

    // assert
    expect(refusal).toBe('bowl.heic is not a .jpg, .png or .webp — only JPEG, PNG and WebP photos are supported');
  });

  it('accepts a photo of exactly 10 MB and refuses one a byte over', () => {
    // arrange
    const atCap = { name: 'bowl.jpg', type: 'image/jpeg', size: RECIPE_PHOTO_MAX_BYTES };
    const overCap = { ...atCap, size: RECIPE_PHOTO_MAX_BYTES + 1 };

    // act
    const refusals = [recipePhotoRefusal(atCap), recipePhotoRefusal(overCap)];

    // assert
    expect(refusals).toEqual([undefined, 'bowl.jpg is larger than 10 MB']);
  });

  it('names the file the server found no photo in', () => {
    // arrange
    const file = { name: 'renamed.jpg' };

    // act
    const refusal = recipePhotoContentRefusal(file);

    // assert
    expect(refusal).toBe('renamed.jpg doesn’t contain a JPEG, PNG or WebP photo.');
  });
});
