import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SetSpec } from '../../domain/program';
import { SetRows, SetTable } from './SetTable';
import { WriteInCell } from './WriteInCell';

const SETS: SetSpec[] = [
  { kind: 'warm-up', reps: { min: 8, max: 8 } },
  { kind: 'working', reps: { min: 6, max: 10 }, rir: 2 },
  { kind: 'working', reps: { min: 6, max: 10 }, rir: 2, weightKg: 40 },
];

describe('SetTable', () => {
  it('lists each set with its mark, reps, RIR and weight, leaving the weight empty where none is suggested', () => {
    // arrange
    const sets = SETS;

    // act
    render(<SetTable exerciseName="Barbell Back Squat" unit="" sets={sets} />);

    // assert
    const table = screen.getByRole('table', { name: 'Sets for Barbell Back Squat' });
    expect(within(table).getAllByRole('columnheader').map(head => head.textContent)).toEqual(['Set', 'Reps', 'RIR', 'Weight']);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map(row => within(row).getByRole('rowheader'))).toEqual(['Warm-up set 1', 'Set 1', 'Set 2'].map(name => screen.getByRole('rowheader', { name })));
    expect(within(rows[0]).getByText('lighter')).toBeInTheDocument();
    expect(within(rows[1]).getAllByRole('cell').at(-1)).toBeEmptyDOMElement();
    expect(within(rows[2]).getByText('kg')).toBeInTheDocument();
  });

  it('heads the reps column Reps and sets the unit after every reps value', () => {
    // arrange
    const sets = SETS.slice(1);

    // act
    render(<SetTable exerciseName="Bulgarian Split Squat" unit="per side" sets={sets} />);

    // assert
    expect(screen.getByRole('columnheader', { name: 'Reps' })).toBeInTheDocument();
    const rows = screen.getAllByRole('row').slice(1);
    rows.forEach(row => expect(within(row).getAllByRole('cell')[0]).toHaveTextContent('6–10per side'));
  });
});

describe('SetRows', () => {
  it('appends the log cell to every set, warm-up sets included, and names each row by its exercise and set', () => {
    // arrange
    const logCell = <WriteInCell kind="entry" as="td" />;

    // act
    render(
      <table>
        <tbody>
          <SetRows sets={SETS} weight="none" size="document" exerciseName="Barbell Back Squat" trailing={logCell} />
        </tbody>
      </table>,
    );

    // assert
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByRole('rowheader', { name: 'Barbell Back Squat, Warm-up set 1' })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('rowheader', { name: 'Barbell Back Squat, Set 1' })).toBeInTheDocument();
    rows.forEach(row => {
      expect(within(row).getAllByRole('cell')).toHaveLength(2);
      expect(within(row).getAllByRole('cell', { hidden: true })).toHaveLength(3);
    });
  });
});
