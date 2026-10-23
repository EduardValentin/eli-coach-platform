import { useId } from 'react';
import { Bed, Dumbbell, HeartPulse, MoreHorizontal } from 'lucide-react';
import { cardioOn, sessionOn, WEEKDAY_LABELS, WEEKDAYS, type Block, type CardioSession, type Weekday } from '../../../domain/program';
import { emptyCardioSession } from '../../../domain/programCardio';
import { blockWithDay, describeLoss, type DayChoice } from '../../../domain/weekEditing';
import { CARDIO_CHIP_CLASS, CardioLength, DayCardFrame, DayName, RestLabel, sessionChipClass } from '../../program-view/dayCard';
import { WIDGET_TITLE_CLASS } from '../../typography';
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
import { useResetConfirm, type ResetRequest } from './ResetConfirm';

type WeekDaysProps = { block: Block; onChange: (block: Block) => void; onOpenSession: (sessionId: string) => void };
type DayCardProps = WeekDaysProps & { day: Weekday; onRequest: (request: ResetRequest) => void };

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
        <DropdownMenuItem onSelect={() => onChoose({ kind: 'cardio', session: emptyCardioSession() })}>
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

function CardioSummary({ cardio, onOpen }: { cardio: CardioSession; onOpen: () => void }) {
  return (
    <>
      <button type="button" onClick={onOpen} className={CARDIO_CHIP_CLASS}>
        <span className="truncate">{cardio.name}</span>
      </button>
      <CardioLength cardio={cardio} />
    </>
  );
}

function dayTitle(block: Block, day: Weekday, choice: DayChoice): string {
  const weekday = WEEKDAY_LABELS[day];
  if (choice.kind === 'rest') return `Make ${weekday} a rest day?`;
  if (choice.kind === 'cardio') return `Make ${weekday} a cardio day?`;
  const name = block.sessions.find(session => session.id === choice.sessionId)?.name ?? 'the session';
  return `Put ${name} on ${weekday}?`;
}

function lostByChoice(block: Block, day: Weekday, choice: DayChoice): string[] {
  const keepsContent = choice.kind !== 'rest' && choice.kind === block.calendar[day].kind;
  return keepsContent ? [] : describeLoss(block, { kind: 'day', weekday: day });
}

function DayCard({ block, day, onChange, onOpenSession, onRequest }: DayCardProps) {
  const session = sessionOn(block, day);
  const cardio = cardioOn(block, day);

  return (
    <DayCardFrame entry={block.calendar[day].kind}>
      <div className="flex items-center justify-between gap-1">
        <h4>
          <DayName day={day} />
        </h4>
        <DayMenu
          block={block}
          day={day}
          onChoose={choice =>
            onRequest({
              title: dayTitle(block, day, choice),
              confirmLabel: 'Change day',
              lines: lostByChoice(block, day, choice),
              apply: () => onChange(blockWithDay(block, day, choice)),
            })
          }
        />
      </div>
      {session && (
        <button type="button" onClick={() => onOpenSession(session.id)} className={sessionChipClass(block.type)}>
          <span className="truncate">{session.name}</span>
        </button>
      )}
      {cardio && <CardioSummary cardio={cardio} onOpen={() => onOpenSession(cardio.id)} />}
      {!session && !cardio && <RestLabel />}
    </DayCardFrame>
  );
}

export function WeekDays(props: WeekDaysProps) {
  const headingId = useId();
  const confirm = useResetConfirm();
  return (
    <section aria-labelledby={headingId} className="grid gap-2">
      <h3 id={headingId} className={WIDGET_TITLE_CLASS}>
        Week
      </h3>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-7">
        {WEEKDAYS.map(day => (
          <DayCard key={day} {...props} day={day} onRequest={confirm.request} />
        ))}
      </ol>
      {confirm.dialog}
    </section>
  );
}
