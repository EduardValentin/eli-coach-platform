import { describe, expect, it } from 'vitest';
import type { Exercise } from '../context/TrainingContext';
import { exercise as fixtureExercise } from '../../test/programFixtures';
import type { Equipment } from './exercises';
import { substitutionsFor } from './substitutions';

function exercise(id: string, equipment: Equipment[], overrides: Partial<Exercise> = {}): Exercise {
  return fixtureExercise(id, { equipment, primaryMuscles: ['Chest'], pattern: 'horizontal-push', ...overrides });
}

describe('substitutionsFor', () => {
  const target = exercise('bench', ['Barbell', 'Bench']);

  it('picks a lighter and a heavier match within the client equipment', () => {
    // arrange
    const library = [
      target,
      exercise('machine-press', ['Machine']),
      exercise('db-press', ['Dumbbells']),
      exercise('pushup', []),
      exercise('row', [], { pattern: 'horizontal-pull' }),
      exercise('archived', [], { archivedAt: '2026-01-01' }),
      exercise('other-muscle', [], { primaryMuscles: ['Triceps'] }),
    ];

    // act
    const ids = substitutionsFor(target, library, ['Dumbbells', 'Machine']);

    // assert
    expect(ids).toEqual(['db-press', 'machine-press']);
  });

  it('falls back to equipment the client lacks', () => {
    // arrange
    const library = [target, exercise('cable-fly', ['Cable']), exercise('db-press', ['Dumbbells'])];

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
