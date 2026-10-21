import { Fragment } from 'react';
import type { Exercise } from '../../context/TrainingContext';
import { formatRange, setsSummary, setText, uniformSets, workingSets, type Block, type Session, type WorkingSet } from '../../domain/program';
import { repsSuffix } from '../coach-portal/program/rowFields';
import { cn } from '../ui/utils';

type TrackingTableProps = { session: Session; block: Block; exercisesById: ReadonlyMap<string, Exercise> };

const HINT = 'kg × reps';

function weekLabel(block: Block, week: number): string {
  return block.calibrationWeek && week === 1 ? 'Week 1 (calibration)' : `Week ${week}`;
}

function setLabel(sets: WorkingSet[], index: number, suffix: string): string {
  const set = sets[index];
  const target = uniformSets(sets) ? `${formatRange(set.reps)}${suffix}` : setText(set, suffix);
  return `${index + 1} · ${target}`;
}

export function TrackingTable({ session, block, exercisesById }: TrackingTableProps) {
  const weeks = Array.from({ length: block.weeks }, (_, index) => index + 1);
  const rows = session.rows.filter(row => row.exerciseId !== '');
  const cell = 'border border-border px-1 py-1 text-left align-top sm:px-2';

  return (
    <div className="overflow-x-auto">
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
          {rows.map(row => {
            const exercise = exercisesById.get(row.exerciseId);
            const suffix = repsSuffix(exercise);
            const sets = workingSets(row.sets);
            return (
              <Fragment key={row.id}>
                {sets.map((_, setIndex) => (
                  <tr key={setIndex}>
                    {setIndex === 0 && (
                      <th scope="row" rowSpan={sets.length} className={cell}>
                        <span className="block">{exercise?.name ?? 'Exercise removed'}</span>
                        {uniformSets(row.sets) && <span className="block font-normal text-text-secondary">{setsSummary(row.sets, suffix)}</span>}
                      </th>
                    )}
                    <td className={cn(cell, 'whitespace-nowrap tabular-nums')}>{setLabel(sets, setIndex, suffix)}</td>
                    {weeks.map(week => (
                      <td key={week} className={`${cell} h-7`} />
                    ))}
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
