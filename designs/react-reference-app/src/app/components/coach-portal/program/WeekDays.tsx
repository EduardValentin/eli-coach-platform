import { useId } from 'react';
import { Bed, Dumbbell, HeartPulse, MoreHorizontal } from 'lucide-react';
import { useTraining } from '../../../context/TrainingContext';
import { WEEKDAYS, type Block, type CardioSession, type Weekday } from '../../../domain/program';
import { cardioMinutes, cardioPreset } from '../../../domain/programCardio';
import { blockWithDay, type DayChoice } from '../../../domain/weekEditing';
import { LABEL_CLASS, WIDGET_TITLE_CLASS } from '../../typography';
import { Button } from '../../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { cn } from '../../ui/utils';
import { BLOCK_SOFT, WEEKDAY_LABELS } from './program-constants';

type WeekDaysProps = { block: Block; onChange: (block: Block) => void; onOpenSession: (sessionId: string) => void };

const KIND_BADGE_CLASS = 'inline-flex max-w-full items-center gap-1.5 rounded-field px-2 py-1 text-xs font-medium';

function DayMenu({ block, day, onChoose }: { block: Block; day: Weekday; onChoose: (choice: DayChoice) => void }) {
  const { exercises } = useTraining();
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label={`${WEEKDAY_LABELS[day]} options`} className="-mr-1">
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Dumbbell aria-hidden="true" className="mr-2 size-4 text-text-secondary" />
            Session
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {block.sessions.map(session => (
              <DropdownMenuItem key={session.id} onSelect={() => onChoose({ kind: 'session', sessionId: session.id })}>
                {session.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onSelect={() => onChoose({ kind: 'cardio', session: cardioPreset('liss', exercises) })}>
          <HeartPulse aria-hidden="true" />
          Cardio
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onChoose({ kind: 'rest' })}>
          <Bed aria-hidden="true" />
          Rest
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CardioSummary({ cardio }: { cardio: CardioSession }) {
  return (
    <p className="grid text-xs text-text-secondary">
      <span className="font-medium text-text-primary">{cardio.name}</span>
      <span className="tabular-nums">{`${cardioMinutes(cardio)} min`}</span>
    </p>
  );
}

function DayCard({ block, day, onChange, onOpenSession }: WeekDaysProps & { day: Weekday }) {
  const entry = block.calendar[day];
  const session = entry.kind === 'session' ? block.sessions.find(other => other.id === entry.sessionId) : undefined;
  const cardio = entry.kind === 'cardio' ? block.cardioSessions.find(other => other.id === entry.cardioId) : undefined;
  const weekday = WEEKDAY_LABELS[day];

  return (
    <li
      className={cn('grid content-start gap-2 rounded-control border p-2', {
        'border-border bg-card': entry.kind !== 'rest',
        'border-border-subtle bg-surface-subtle': entry.kind === 'rest',
      })}
    >
      <div className="flex items-center justify-between gap-1">
        <h4 className={LABEL_CLASS}>
          <span aria-hidden="true">{weekday.slice(0, 3)}</span>
          <span className="sr-only">{weekday}</span>
        </h4>
        <DayMenu block={block} day={day} onChoose={choice => onChange(blockWithDay(block, day, choice))} />
      </div>
      {session && (
        <button
          type="button"
          onClick={() => onOpenSession(session.id)}
          className={cn(KIND_BADGE_CLASS, BLOCK_SOFT[block.type], 'text-left text-text-primary outline-none hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring/50')}
        >
          <span className="truncate">{session.name}</span>
        </button>
      )}
      {cardio && (
        <>
          <span className={cn(KIND_BADGE_CLASS, 'bg-training-recovery-soft text-training-recovery')}>Cardio</span>
          <CardioSummary cardio={cardio} />
        </>
      )}
      {!session && !cardio && <span className={cn(KIND_BADGE_CLASS, 'text-text-secondary')}>Rest</span>}
    </li>
  );
}

export function WeekDays(props: WeekDaysProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="grid gap-2">
      <h3 id={headingId} className={WIDGET_TITLE_CLASS}>
        Week
      </h3>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-7">
        {WEEKDAYS.map(day => (
          <DayCard key={day} {...props} day={day} />
        ))}
      </ol>
    </section>
  );
}
