import { describe, it, expect } from 'vitest';
import { matchesExerciseFilters } from './exerciseFilters';
import type { Exercise } from '../context/TrainingContext';

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: 'e-test',
    name: 'Barbell Back Squat',
    description: '',
    equipment: ['Barbell'],
    difficulty: 'Intermediate',
    primaryMuscles: ['Quadriceps'],
    secondaryMuscles: [],
    tags: ['Strength'],
    ...overrides,
  };
}

describe('matchesExerciseFilters', () => {
  it('keeps every exercise when nothing is searched or filtered', () => {
    // arrange
    const exercise = makeExercise();

    // act
    const result = matchesExerciseFilters({ exercise, searchQuery: '', activeFilters: [] });

    // assert
    expect(result).toBe(true);
  });

  it('matches the search against the name, ignoring case and surrounding space', () => {
    // arrange
    const exercise = makeExercise({ name: 'Barbell Back Squat' });

    // act
    const result = matchesExerciseFilters({ exercise, searchQuery: '  BACK sq ', activeFilters: [] });

    // assert
    expect(result).toBe(true);
  });

  it('matches the search against a primary muscle', () => {
    // arrange
    const exercise = makeExercise({ name: 'Leg Press', primaryMuscles: ['Quadriceps', 'Glutes'] });

    // act
    const result = matchesExerciseFilters({ exercise, searchQuery: 'glute', activeFilters: [] });

    // assert
    expect(result).toBe(true);
  });

  it('searches primary muscles only, not secondary ones', () => {
    // arrange
    const exercise = makeExercise({
      name: 'Leg Press',
      primaryMuscles: ['Quadriceps'],
      secondaryMuscles: ['Core'],
    });

    // act
    const result = matchesExerciseFilters({ exercise, searchQuery: 'core', activeFilters: [] });

    // assert
    expect(result).toBe(false);
  });

  it('rejects an exercise the search does not name', () => {
    // arrange
    const exercise = makeExercise({ name: 'Leg Press', primaryMuscles: ['Quadriceps'] });

    // act
    const result = matchesExerciseFilters({ exercise, searchQuery: 'bench', activeFilters: [] });

    // assert
    expect(result).toBe(false);
  });

  it('keeps an exercise carrying the single selected tag', () => {
    // arrange
    const exercise = makeExercise({ tags: ['Strength'] });

    // act
    const result = matchesExerciseFilters({ exercise, searchQuery: '', activeFilters: ['Strength'] });

    // assert
    expect(result).toBe(true);
  });

  it('drops an exercise that does not carry the selected tag', () => {
    // arrange
    const exercise = makeExercise({ tags: ['Recovery'] });

    // act
    const result = matchesExerciseFilters({ exercise, searchQuery: '', activeFilters: ['Strength'] });

    // assert
    expect(result).toBe(false);
  });

  it('drops an untagged exercise once any tag is selected', () => {
    // arrange
    const exercise = makeExercise({ tags: undefined });

    // act
    const result = matchesExerciseFilters({ exercise, searchQuery: '', activeFilters: ['Strength'] });

    // assert
    expect(result).toBe(false);
  });

  it('treats two selected tags as "either", not "both"', () => {
    // arrange
    const strengthOnly = makeExercise({ tags: ['Strength'] });

    // act
    const result = matchesExerciseFilters({
      exercise: strengthOnly,
      searchQuery: '',
      activeFilters: ['Strength', 'Hypertrophy'],
    });

    // assert
    expect(result).toBe(true);
  });

  it('reads an explicit "None" marker as equipment-free', () => {
    // arrange
    const exercise = makeExercise({ equipment: ['None'] });

    // act
    const asNoEquipment = matchesExerciseFilters({ exercise, searchQuery: '', activeFilters: ['No Equipment'] });
    const asEquipment = matchesExerciseFilters({ exercise, searchQuery: '', activeFilters: ['Equipment'] });

    // assert
    expect(asNoEquipment).toBe(true);
    expect(asEquipment).toBe(false);
  });

  it('still counts a real item listed alongside a "None" marker as equipment', () => {
    // arrange
    const exercise = makeExercise({ equipment: ['None', 'Barbell'] });

    // act
    const result = matchesExerciseFilters({ exercise, searchQuery: '', activeFilters: ['Equipment'] });

    // assert
    expect(result).toBe(true);
  });

  it('counts a bodyweight exercise as equipment, since the coach described its loading', () => {
    // arrange
    const exercise = makeExercise({ equipment: ['Bodyweight'] });

    // act
    const asEquipment = matchesExerciseFilters({ exercise, searchQuery: '', activeFilters: ['Equipment'] });
    const asNoEquipment = matchesExerciseFilters({ exercise, searchQuery: '', activeFilters: ['No Equipment'] });

    // assert
    expect(asEquipment).toBe(true);
    expect(asNoEquipment).toBe(false);
  });

  it('keeps an equipment exercise under the Equipment chip and drops a no-equipment one', () => {
    // arrange
    const barbell = makeExercise({ equipment: ['Barbell'] });
    const plank = makeExercise({ equipment: [] });

    // act
    const barbellResult = matchesExerciseFilters({ exercise: barbell, searchQuery: '', activeFilters: ['Equipment'] });
    const plankResult = matchesExerciseFilters({ exercise: plank, searchQuery: '', activeFilters: ['Equipment'] });

    // assert
    expect(barbellResult).toBe(true);
    expect(plankResult).toBe(false);
  });

  it('keeps a no-equipment exercise under the No Equipment chip and drops an equipment one', () => {
    // arrange
    const plank = makeExercise({ equipment: [] });
    const barbell = makeExercise({ equipment: ['Barbell'] });

    // act
    const plankResult = matchesExerciseFilters({ exercise: plank, searchQuery: '', activeFilters: ['No Equipment'] });
    const barbellResult = matchesExerciseFilters({ exercise: barbell, searchQuery: '', activeFilters: ['No Equipment'] });

    // assert
    expect(plankResult).toBe(true);
    expect(barbellResult).toBe(false);
  });

  it('treats both equipment chips together as "either", so neither kind is excluded', () => {
    // arrange
    const plank = makeExercise({ equipment: [] });
    const barbell = makeExercise({ equipment: ['Barbell'] });

    // act
    const plankResult = matchesExerciseFilters({
      exercise: plank,
      searchQuery: '',
      activeFilters: ['Equipment', 'No Equipment'],
    });
    const barbellResult = matchesExerciseFilters({
      exercise: barbell,
      searchQuery: '',
      activeFilters: ['Equipment', 'No Equipment'],
    });

    // assert
    expect(plankResult).toBe(true);
    expect(barbellResult).toBe(true);
  });

  it('intersects the tag and equipment groups', () => {
    // arrange
    const strengthWithBarbell = makeExercise({ tags: ['Strength'], equipment: ['Barbell'] });

    // act
    const result = matchesExerciseFilters({
      exercise: strengthWithBarbell,
      searchQuery: '',
      activeFilters: ['Strength', 'No Equipment'],
    });

    // assert
    expect(result).toBe(false);
  });

  it('requires the search and the filters to agree', () => {
    // arrange
    const exercise = makeExercise({ name: 'Plank', tags: ['Recovery'], equipment: [] });

    // act
    const agreeing = matchesExerciseFilters({
      exercise,
      searchQuery: 'plank',
      activeFilters: ['Recovery', 'No Equipment'],
    });
    const disagreeing = matchesExerciseFilters({
      exercise,
      searchQuery: 'squat',
      activeFilters: ['Recovery', 'No Equipment'],
    });

    // assert
    expect(agreeing).toBe(true);
    expect(disagreeing).toBe(false);
  });
});
