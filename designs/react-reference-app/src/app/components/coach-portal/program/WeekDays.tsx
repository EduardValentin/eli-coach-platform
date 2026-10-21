import { useId } from 'react';
import { Bed, Dumbbell, HeartPulse, MoreHorizontal } from 'lucide-react';
import { WEEKDAYS, type Block, type CardioSession, type CardioType, type Weekday } from '../../../domain/program';
import { blockWithCardio, blockWithDay, type DayChoice } from '../../../domain/weekEditing';
import { LABEL_CLASS } from '../../typography';
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
import { Input } from '../../ui/input';
import { cn } from '../../ui/utils';
import { BLOCK_SOFT, CARDIO_TYPE_LABELS, WEEKDAY_LABELS } from './program-constants';
import { SegmentedChoice } from './SegmentedChoice';

type WeekDaysProps = { block: Block; onChange: (block: Block) => void; onOpenSession: (sessionId: string) => void };

const CARDIO_OPTIONS = (Object.keys(CARDIO_TYPE_LABELS) as CardioType[]).map(value => ({ value, label: CARDIO_TYPE_LABELS[value] }));
const KIND_BADGE_CLASS = 'inline-flex max-w-full items-center gap-1.5 rounded-field px-2 py-1 text-xs font-medium';

function DayMenu({ block, day, onChoose }: { block: Block; day: Weekday; onChoose: (choice: DayChoice) => void }) {
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
        <DropdownMenuItem onSelect={() => onChoose({ kind: 'cardio' })}>
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

function CardioFields({ day, cardio, onChange }: { day: Weekday; cardio: CardioSession; onChange: (cardio: CardioSession) => void }) {
  const weekday = WEEKDAY_LABELS[day];
  return (
    <div className="grid gap-2">
      <SegmentedChoice legend={`${weekday} cardio type`} options={CARDIO_OPTIONS} value={cardio.type} orientation="column" onChange={type => onChange({ ...cardio, type })} />
      <label className="flex items-center gap-1.5 text-xs text-text-secondary">
        <Input
          size="sm"
          type="number"
          min={1}
          inputMode="numeric"
          aria-label={`${weekday} cardio minutes`}
          value={cardio.minutes}
          onChange={event => onChange({ ...cardio, minutes: Number(event.target.value) })}
          className="w-full min-w-0 px-2 tabular-nums"
        />
        min
      </label>
    </div>
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
          <CardioFields day={day} cardio={cardio} onChange={next => onChange(blockWithCardio(block, next))} />
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
      <h3 id={headingId} className="text-base font-semibold text-text-primary">
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
