import { useId } from 'react';
import type { Exercise } from '../../context/TrainingContext';
import {
  formatRange,
  isWorkingSet,
  positionLabel,
  WEEKDAYS,
  type Block,
  type CardioSession,
  type Row,
  type Session,
  type SetSpec,
  type Weekday,
} from '../../domain/program';
import { cardioMinutes, SEGMENT_KIND_LABELS } from '../../domain/programCardio';
import { estimatedMinutes } from '../../domain/programSuggestions';
import { repsSuffix } from '../coach-portal/program/rowFields';
import { WEEKDAY_LABELS } from '../coach-portal/program/program-constants';
import { LABEL_CLASS } from '../typography';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import { cardioFor, cardioSegmentText, restLabel, sessionAnchor, sessionFor, warmUpLines } from './programView';

type Scheduled = { kind: 'session'; session: Session; days: Weekday[] } | { kind: 'cardio'; cardio: CardioSession; days: Weekday[] };

const ARTICLE_CLASS = 'scroll-mt-6 rounded-card border border-border bg-card shadow-card';

function scheduledOn(block: Block, day: Weekday): Scheduled | null {
  const session = sessionFor(block, day);
  if (session) return { kind: 'session', session, days: [] };
  const cardio = cardioFor(block, day);
  return cardio ? { kind: 'cardio', cardio, days: [] } : null;
}

function idOf(item: Scheduled): string {
  return item.kind === 'session' ? item.session.id : item.cardio.id;
}

function scheduledOf(block: Block): Scheduled[] {
  const byId = new Map<string, Scheduled>();
  for (const day of WEEKDAYS) {
    const item = scheduledOn(block, day);
    if (!item) continue;
    const scheduled = byId.get(idOf(item)) ?? item;
    scheduled.days.push(day);
    byId.set(idOf(item), scheduled);
  }
  return [...byId.values()];
}

function daysText(days: readonly Weekday[]): string {
  return days.map(day => WEEKDAY_LABELS[day]).join(' · ');
}

function setLine(set: SetSpec, index: number, suffix: string): string {
  const weight = set.weightKg === undefined ? '' : ` · ${set.weightKg} kg`;
  if (!isWorkingSet(set)) return `Set ${index + 1} · Warm-up · ${formatRange(set.reps)}${suffix || ' reps'}${weight}`;
  return `Set ${index + 1} · ${formatRange(set.reps)}${suffix} · RIR ${formatRange(set.rir)}${weight}`;
}

function CardHeader({ headingId, name, days, meta }: { headingId: string; name: string; days: readonly Weekday[]; meta: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b border-border-subtle px-4 py-3 sm:px-5">
      <div className="grid gap-1">
        <p className={LABEL_CLASS}>{daysText(days)}</p>
        <h3 id={headingId} className="font-serif text-xl text-text-primary">
          {name}
        </h3>
      </div>
      <p className="text-sm text-text-secondary tabular-nums">{meta}</p>
    </div>
  );
}

function ExerciseReadCard({ session, row, exercisesById }: { session: Session; row: Row; exercisesById: ReadonlyMap<string, Exercise> }) {
  const headingId = useId();
  const exercise = exercisesById.get(row.exerciseId);
  const suffix = repsSuffix(exercise);
  const swaps = row.substitutions.flatMap(id => exercisesById.get(id)?.name ?? []);

  return (
    <article aria-labelledby={headingId} className="grid content-start gap-3 rounded-control border border-border bg-card p-3">
      <div className="grid gap-1">
        <h4 id={headingId} className="flex items-center gap-2.5">
          <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-surface-inverted px-1.5 text-xs font-semibold text-surface-inverted-foreground tabular-nums">
            {positionLabel(session, row)}
          </span>{' '}
          <span className="min-w-0 text-sm font-medium text-text-primary">{exercise?.name ?? 'Exercise removed'}</span>
        </h4>
        <p className="flex flex-wrap items-center gap-1 pl-9.5">
          {exercise?.primaryMuscles.map(muscle => (
            <Badge key={muscle} tone="muted">
              {muscle}
            </Badge>
          ))}
          <span className="text-xs text-text-secondary tabular-nums">{[`Rest ${restLabel(row.restSeconds)}`, row.tempo && `Tempo ${row.tempo}`].filter(Boolean).join(' · ')}</span>
        </p>
      </div>
      <ol aria-label="Sets" className="grid gap-1 border-t border-border-subtle pt-2.5 pl-9.5 text-sm tabular-nums">
        {row.sets.map((set, index) => (
          <li key={index} className={cn({ 'text-text-secondary': !isWorkingSet(set), 'text-text-primary': isWorkingSet(set) })}>
            {setLine(set, index, suffix)}
          </li>
        ))}
      </ol>
      {(row.cues || swaps.length > 0) && (
        <div className="grid gap-1 pl-9.5 text-xs text-text-secondary">
          {row.cues && <p>{row.cues}</p>}
          {swaps.length > 0 && <p>{`Swap for: ${swaps.join(', ')}`}</p>}
        </div>
      )}
    </article>
  );
}

function SessionReadCard({ session, days, exercisesById }: { session: Session; days: readonly Weekday[]; exercisesById: ReadonlyMap<string, Exercise> }) {
  const headingId = useId();
  const count = session.rows.length;
  const warmUp = warmUpLines(session, exercisesById);

  return (
    <article id={sessionAnchor(session.id)} aria-labelledby={headingId} className={ARTICLE_CLASS}>
      <CardHeader
        headingId={headingId}
        name={session.name}
        days={days}
        meta={`${count} ${count === 1 ? 'exercise' : 'exercises'} · ~${estimatedMinutes(session)} min`}
      />
      <div className="grid gap-4 p-3 sm:p-4">
        {warmUp.length > 0 && (
          <div className="grid gap-2 rounded-control bg-surface-subtle p-3">
            <p className={LABEL_CLASS}>Warm-up</p>
            <p className="text-sm text-text-secondary">{warmUp.join(', ')}</p>
          </div>
        )}
        <div className="grid gap-3 lg:grid-cols-2">
          {session.rows.map(row => (
            <ExerciseReadCard key={row.id} session={session} row={row} exercisesById={exercisesById} />
          ))}
        </div>
        {session.coolDown.enabled && <p className="text-sm text-text-secondary">Ends with a cool-down</p>}
      </div>
    </article>
  );
}

function CardioReadCard({ cardio, days, exercisesById }: { cardio: CardioSession; days: readonly Weekday[]; exercisesById: ReadonlyMap<string, Exercise> }) {
  const headingId = useId();
  return (
    <article id={sessionAnchor(cardio.id)} aria-labelledby={headingId} className={ARTICLE_CLASS}>
      <CardHeader headingId={headingId} name={cardio.name} days={days} meta={cardio.segments.length > 0 ? `Cardio · ${cardioMinutes(cardio)} min` : 'Cardio · no segments'} />
      <ol aria-label="Segments" className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4">
        {cardio.segments.map(segment => (
          <li key={segment.id} className="grid content-start gap-1 rounded-control border border-l-4 border-border border-l-training-recovery bg-card p-3">
            <p className={LABEL_CLASS}>{SEGMENT_KIND_LABELS[segment.kind]}</p>
            <p className="text-sm text-text-primary">{cardioSegmentText(segment, exercisesById)}</p>
          </li>
        ))}
      </ol>
    </article>
  );
}

export function BlockSessions({ block, exercisesById }: { block: Block; exercisesById: ReadonlyMap<string, Exercise> }) {
  return (
    <div className="grid gap-5">
      {scheduledOf(block).map(item =>
        item.kind === 'session' ? (
          <SessionReadCard key={item.session.id} session={item.session} days={item.days} exercisesById={exercisesById} />
        ) : (
          <CardioReadCard key={item.cardio.id} cardio={item.cardio} days={item.days} exercisesById={exercisesById} />
        ),
      )}
    </div>
  );
}
