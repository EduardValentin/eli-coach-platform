import { Fragment } from 'react';
import type { Exercise } from '../../context/TrainingContext';
import type { Block, Session } from '../../domain/program';

type TrackingTableProps = { session: Session; block: Block; exercisesById: ReadonlyMap<string, Exercise> };

const HINT = 'kg × reps';

function weekLabel(block: Block, week: number): string {
  return block.calibrationWeek && week === 1 ? 'Week 1 (calibration)' : `Week ${week}`;
}

export function TrackingTable({ session, block, exercisesById }: TrackingTableProps) {
  const weeks = Array.from({ length: block.weeks }, (_, index) => index + 1);
  const rows = session.rows.filter(row => row.exerciseId !== '');
  const cell = 'border border-border px-2 py-1 text-left align-top';

  return (
    <table className="w-full border-collapse text-xs text-text-primary">
      <caption className="mb-1 text-left text-sm font-semibold">{session.name} · tracking</caption>
      <thead>
        <tr>
          <th scope="col" className={cell}>
            Exercise
          </th>
          <th scope="col" className={cell}>
            Set
          </th>
          {weeks.map(week => (
            <th key={week} scope="col" className={cell}>
              {weekLabel(block, week)}
            </th>
          ))}
        </tr>
        <tr>
          <td colSpan={2} className={cell} />
          {weeks.map(week => (
            <th key={week} scope="col" className={`${cell} font-normal text-text-secondary`}>
              {HINT}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <Fragment key={row.id}>
            {Array.from({ length: row.sets }, (_, setIndex) => (
              <tr key={setIndex}>
                {setIndex === 0 && (
                  <th scope="row" rowSpan={row.sets} className={cell}>
                    {exercisesById.get(row.exerciseId)?.name ?? 'Exercise removed'}
                  </th>
                )}
                <td className={cell}>{setIndex + 1}</td>
                {weeks.map(week => (
                  <td key={week} className={`${cell} h-7`} />
                ))}
              </tr>
            ))}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
