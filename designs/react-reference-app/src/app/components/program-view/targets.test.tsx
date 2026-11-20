import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { exercise, row as fixtureRow, startSets } from '../../../test/programFixtures';
import type { Row } from '../../domain/program';
import { withSetAdded, withTypedTargets, type ProgressionContext } from '../../domain/programProgression';
import { weekRangeTargets } from './targets';

const squat = exercise('squat', { equipment: ['Barbell', 'Squat rack'], role: 'main-compound', pattern: 'squat' });
const FIRST_PLAN_WEEK = 5;

function context(block: Partial<ProgressionContext['block']> = {}): ProgressionContext {
  return { level: 'intermediate', exercise: squat, block: { type: 'hypertrophy', weeks: 6, calibrationWeek: false, ...block } };
}

function squatRow(): Row {
  return fixtureRow({
    exerciseId: 'squat',
    slot: 'A',
    startSets: startSets({ count: 3, reps: { min: 6, max: 8 }, rir: 3, weightKg: 60 }),
  });
}

function withExtraSetIn(row: Row, weeks: number[], blockContext: ProgressionContext): Row {
  return weeks.reduce((current, week) => withSetAdded(current, week, blockContext), row);
}

function summary(row: Row, blockContext: ProgressionContext): { term: string; shown: string; spoken: string } {
  const [{ term, value }] = weekRangeTargets(row, blockContext, FIRST_PLAN_WEEK);
  const { container } = render(<>{value}</>);
  return {
    term,
    shown: container.querySelector('[aria-hidden]')?.textContent ?? container.textContent ?? '',
    spoken: container.querySelector('.sr-only')?.textContent ?? container.textContent ?? '',
  };
}

const TRAJECTORY = '60 → 65 kg · RIR 3 → 1';
const TRAJECTORY_SPOKEN = '60 to 65 kg, RIR 3 to 1';

function differingIn(weeks: number[], blockContext = context()) {
  return summary(withExtraSetIn(squatRow(), weeks, blockContext), blockContext);
}

describe('weekRangeTargets when weeks differ', () => {
  it('names the one week that differs, after the change among the other weeks', () => {
    // act
    const result = differingIn([5]);

    // assert
    expect(result).toEqual({ term: 'Progression', shown: `${TRAJECTORY} · week 9 differs`, spoken: `${TRAJECTORY_SPOKEN}, week 9 differs` });
  });

  it('lists two weeks that are not adjacent', () => {
    // act
    const result = differingIn([2, 5]);

    // assert
    expect(result.shown).toBe(`${TRAJECTORY} · weeks 6, 9 differ`);
    expect(result.spoken).toBe(`${TRAJECTORY_SPOKEN}, weeks 6, 9 differ`);
  });

  it('collapses a run of three weeks into a range', () => {
    // act
    const result = differingIn([2, 3, 4]);

    // assert
    expect(result.shown).toBe(`${TRAJECTORY} · weeks 6–8 differ`);
  });

  it('keeps two adjacent weeks listed one by one', () => {
    // act
    const result = differingIn([3, 4]);

    // assert
    expect(result.shown).toBe(`${TRAJECTORY} · weeks 7, 8 differ`);
  });

  it('shows only the differing week when fewer than two weeks are uniform', () => {
    // arrange
    const blockContext = context({ weeks: 2 });
    const row = withTypedTargets(squatRow(), { week: 2, setId: 'set-3' }, { weightKg: 50 });

    // act
    const result = summary(row, blockContext);

    // assert
    expect(result.shown).toBe('week 6 differs');
    expect(result.spoken).toBe('week 6 differs');
  });

  it('says every week differs when no loading week matches the first', () => {
    // arrange
    const blockContext = context({ weeks: 3 });
    const row = withTypedTargets(squatRow(), { week: 1, setId: 'set-3' }, { weightKg: 50 });

    // act
    const result = summary(row, blockContext);

    // assert
    expect(result.shown).toBe('every week differs');
  });

  it('still names plan weeks in the note when the block has a calibration week', () => {
    // arrange
    const blockContext = context({ calibrationWeek: true });

    // act
    const result = differingIn([5], blockContext);

    // assert
    expect(result.term).toBe('Progression');
    expect(result.shown).toMatch(/ · week 9 differs$/);
  });
});

describe('weekRangeTargets when no week differs', () => {
  it('shows the count change when the counts only rise', () => {
    // act
    const result = differingIn([6]);

    // assert
    expect(result.shown).toBe(`3 → 4 sets · ${TRAJECTORY}`);
  });

  it('compares the lowest to highest RIR of the first week with that of the last when the sets step down', () => {
    // arrange
    const blockContext = context({ weeks: 2 });
    const stepped = fixtureRow({ ...squatRow(), startSets: startSets({ count: 3, reps: { min: 6, max: 8 }, rir: 3, lastSetRir: 2, weightKg: 60 }) });
    const row = [2, 2, 1].reduce((typed, rir, index) => withTypedTargets(typed, { week: 2, setId: `set-${index + 1}` }, { rir }), stepped);

    // act
    const result = summary(row, blockContext);

    // assert
    expect(result).toEqual({ term: 'Progression', shown: 'RIR 2–3 → 1–2', spoken: 'RIR 2–3 to 1–2' });
  });

  it('shows the trajectory alone when the weeks are uniform', () => {
    // act
    const result = summary(squatRow(), context());

    // assert
    expect(result.shown).toBe(TRAJECTORY);
  });
});
