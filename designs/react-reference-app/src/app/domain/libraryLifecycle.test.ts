import { describe, expect, it } from 'vitest';
import {
  archivedItem,
  countsByStatus,
  exerciseUsage,
  foodUsage,
  isDeletable,
  itemsWithStatus,
  parseStatus,
  pickableItems,
  recipeUsage,
  restoredItem,
  statusOf,
  usageHint,
  type LibraryUsage,
} from './libraryLifecycle';

const ARCHIVED_AT = new Date('2026-10-11T09:30:00.000Z');

const squat = { id: 'e1', name: 'Back squat' };
const lunge = { id: 'e2', name: 'Lunge', archivedAt: '2026-10-01T08:00:00.000Z' };

function program(exercises: { exerciseId: string; swapVariants?: string[] }[]) {
  return { weeks: [{ days: [{ exercises }] }] };
}

function mealPlan(slot: { recipeId?: string; clientSelectedRecipeId?: string; alternativeRecipeIds: string[] }) {
  return { blocks: [{ days: [{ slots: [slot] }] }] };
}

describe('archiving a library item', () => {
  it('stamps the moment it was archived', () => {
    // arrange
    // act
    const archived = archivedItem(squat, ARCHIVED_AT);

    // assert
    expect(archived).toEqual({ ...squat, archivedAt: '2026-10-11T09:30:00.000Z' });
    expect(statusOf(archived)).toBe('archived');
  });

  it('is undone by restoring it', () => {
    // arrange
    const archived = archivedItem(squat, ARCHIVED_AT);

    // act
    const restored = restoredItem(archived, []);

    // assert
    expect(restored).toEqual(squat);
    expect(statusOf(restored)).toBe('active');
  });

  it('splits the library into its active and archived items', () => {
    // arrange
    const library = [squat, lunge];

    // act
    const active = itemsWithStatus(library, 'active');
    const archived = itemsWithStatus(library, 'archived');

    // assert
    expect(active).toEqual([squat]);
    expect(archived).toEqual([lunge]);
    expect(countsByStatus(library)).toEqual({ active: 1, archived: 1 });
  });

  it.each([
    ['archived', 'archived'],
    ['active', 'active'],
    [null, 'active'],
    ['anything', 'active'],
  ] as const)('reads %s from a link as the %s view', (raw, expected) => {
    // arrange
    // act
    const status = parseStatus(raw);

    // assert
    expect(status).toBe(expected);
  });
});

describe('restoring a library item whose name is taken', () => {
  it('keeps its name while no active item holds it', () => {
    // arrange
    const archived = archivedItem(squat, ARCHIVED_AT);

    // act
    const restored = restoredItem(archived, ['Lunge']);

    // assert
    expect(restored.name).toBe('Back squat');
  });

  it('takes the name followed by (2) when an active item holds it', () => {
    // arrange
    const archived = archivedItem(squat, ARCHIVED_AT);

    // act
    const restored = restoredItem(archived, ['Back squat']);

    // assert
    expect(restored).toEqual({ id: 'e1', name: 'Back squat (2)' });
  });

  it('skips to (3) when (2) is taken as well', () => {
    // arrange
    const archived = archivedItem(squat, ARCHIVED_AT);

    // act
    const restored = restoredItem(archived, ['Back squat', 'Back squat (2)']);

    // assert
    expect(restored.name).toBe('Back squat (3)');
  });

  it('shortens a long name so the numbered name stays within 80 characters', () => {
    // arrange
    const longName = 'a'.repeat(80);
    const archived = archivedItem({ id: 'e5', name: longName }, ARCHIVED_AT);

    // act
    const restored = restoredItem(archived, [longName]);

    // assert
    expect(restored.name).toBe(`${'a'.repeat(76)} (2)`);
    expect(restored.name).toHaveLength(80);
  });

  it('drops the spaces the shortening leaves at the end of the name', () => {
    // arrange
    const longName = `${'a'.repeat(75)} aaaa`;
    const archived = archivedItem({ id: 'e6', name: longName }, ARCHIVED_AT);

    // act
    const restored = restoredItem(archived, [longName]);

    // assert
    expect(restored.name).toBe(`${'a'.repeat(75)} (2)`);
  });

  it('compares names ignoring case and surrounding spaces', () => {
    // arrange
    const archived = archivedItem(squat, ARCHIVED_AT);

    // act
    const restored = restoredItem(archived, ['  BACK SQUAT ', 'back squat (2)']);

    // assert
    expect(restored.name).toBe('Back squat (3)');
  });
});

describe('what a picker offers', () => {
  it('leaves archived items out', () => {
    // arrange
    // act
    const offered = pickableItems([squat, lunge]);

    // assert
    expect(offered).toEqual([squat]);
  });

  it('keeps an archived item that is already placed', () => {
    // arrange
    // act
    const offered = pickableItems([squat, lunge], ['e2']);

    // assert
    expect(offered).toEqual([squat, lunge]);
  });
});

describe('how often an exercise is used', () => {
  it('counts the templates and the client plans that prescribe it', () => {
    // arrange
    const programs = {
      templates: [program([{ exerciseId: 'e1' }]), program([{ exerciseId: 'e1' }])],
      plans: [program([{ exerciseId: 'e1' }]), program([{ exerciseId: 'e3' }])],
    };

    // act
    const usage = exerciseUsage('e1', programs);

    // assert
    expect(usage).toEqual({ template: 2, plan: 1 });
  });

  it('counts a swap variant as a use', () => {
    // arrange
    const programs = { templates: [], plans: [program([{ exerciseId: 'e1', swapVariants: ['e2'] }])] };

    // act
    const usage = exerciseUsage('e2', programs);

    // assert
    expect(usage).toEqual({ template: 0, plan: 1 });
  });

  it('allows deleting an exercise no program mentions', () => {
    // arrange
    const programs = { templates: [], plans: [program([{ exerciseId: 'e1' }])] };

    // act
    const usage = exerciseUsage('e9', programs);

    // assert
    expect(isDeletable(usage)).toBe(true);
  });
});

describe('how often a food is used', () => {
  it('counts each recipe that lists it as an ingredient', () => {
    // arrange
    const recipes = [
      { ingredients: [{ foodId: 'rice' }, { foodId: 'chicken' }] },
      { ingredients: [{ foodId: 'oats' }] },
    ];

    // act
    const usage = foodUsage('chicken', recipes);

    // assert
    expect(usage).toEqual({ recipe: 1 });
    expect(isDeletable(usage)).toBe(false);
  });
});

describe('how often a recipe is used', () => {
  it.each([
    ['the planned recipe', { recipeId: 'bowl', alternativeRecipeIds: [] }],
    ['an alternative', { recipeId: 'oats', alternativeRecipeIds: ['bowl'] }],
    ['the client choice', { recipeId: 'oats', clientSelectedRecipeId: 'bowl', alternativeRecipeIds: [] }],
  ])('counts a meal plan holding it as %s', (_role, slot) => {
    // arrange
    const plans = [mealPlan(slot)];

    // act
    const usage = recipeUsage('bowl', plans);

    // assert
    expect(usage).toEqual({ 'meal-plan': 1 });
  });

  it('counts a meal plan once, however many slots hold it', () => {
    // arrange
    const slot = { recipeId: 'bowl', alternativeRecipeIds: [] };
    const plan = { blocks: [{ days: [{ slots: [slot, slot] }, { slots: [slot] }] }] };

    // act
    const usage = recipeUsage('bowl', [plan, mealPlan({ recipeId: 'oats', alternativeRecipeIds: [] })]);

    // assert
    expect(usage).toEqual({ 'meal-plan': 1 });
  });
});

describe('the in-use hint', () => {
  it('is absent when nothing uses the item', () => {
    // arrange
    // act
    const hint = usageHint({ template: 0, plan: 0 });

    // assert
    expect(hint).toBeUndefined();
  });

  it.each<[LibraryUsage, string]>([
    [{ plan: 3 }, 'Used in 3 plans'],
    [{ recipe: 1 }, 'Used in 1 recipe'],
    [{ 'meal-plan': 2 }, 'Used in 2 meal plans'],
    [{ template: 1, plan: 0 }, 'Used in 1 template'],
    [{ template: 2, plan: 3 }, 'Used in 2 templates and 3 plans'],
    [{ template: 1, plan: 1 }, 'Used in 1 template and 1 plan'],
  ])('counts the places with plurals', (usage, expected) => {
    // arrange
    // act
    const hint = usageHint(usage);

    // assert
    expect(hint).toBe(expected);
  });
});
