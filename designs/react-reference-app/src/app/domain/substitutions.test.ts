import { describe, expect, it } from 'vitest';
import { equippedExercise } from '../../test/programFixtures';
import { substitutionsFor } from './substitutions';

describe('substitutionsFor', () => {
  const target = equippedExercise('bench', ['Barbell', 'Bench']);

  it('picks a lighter and a heavier match within the client equipment', () => {
    // arrange
    const library = [
      target,
      equippedExercise('machine-press', ['Machine']),
      equippedExercise('db-press', ['Dumbbells']),
      equippedExercise('pushup', []),
      equippedExercise('row', [], { pattern: 'horizontal-pull' }),
      equippedExercise('archived', [], { archivedAt: '2026-01-01' }),
      equippedExercise('other-muscle', [], { primaryMuscles: ['Triceps'] }),
    ];

    // act
    const ids = substitutionsFor(target, library, ['Dumbbells', 'Machine']);

    // assert
    expect(ids).toEqual(['db-press', 'machine-press']);
  });

  it('falls back to equipment the client lacks', () => {
    // arrange
    const library = [target, equippedExercise('cable-fly', ['Cable']), equippedExercise('db-press', ['Dumbbells'])];

    // act
    const ids = substitutionsFor(target, library, ['Dumbbells']);

    // assert
    expect(ids).toEqual(['db-press', 'cable-fly']);
  });

  it('returns nothing without a matching exercise', () => {
    // act
    const ids = substitutionsFor(target, [target], []);

    // assert
    expect(ids).toEqual([]);
  });
});
