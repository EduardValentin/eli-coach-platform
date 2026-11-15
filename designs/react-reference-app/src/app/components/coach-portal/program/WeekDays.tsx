import { useId, useRef } from 'react';
import { Bed, Dumbbell, HeartPulse, MoreHorizontal } from 'lucide-react';
import { cardioOn, sessionOn, WEEKDAY_LABELS, WEEKDAYS, type Block, type CardioSession, type Weekday } from '../../../domain/program';
import { emptyCardioSession } from '../../../domain/programCardio';
import { blockWithDay, describeLoss, type DayChoice } from '../../../domain/weekEditing';
import { CARDIO_CHIP_CLASS, CardioLength, CHIP_LABEL_CLASS, DayCardFrame, DayName, RestLabel, sessionChipClass } from '../../program-view/dayCard';
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
type DayMenuProps = { block: Block; day: Weekday; onChoose: (choice: DayChoice, trigger: HTMLElement | null) => void };

function DayMenu({ block, day, onChoose }: DayMenuProps) {
  const trigger = useRef<HTMLButtonElement>(null);
  const chosen = useRef<DayChoice | null>(null);
  const choose = (choice: DayChoice) => {
    chosen.current = choice;
  };

  function runOnceFocusIsBackOnTheTrigger() {
    const choice = chosen.current;
    chosen.current = null;
    if (choice) onChoose(choice, trigger.current);
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button ref={trigger} variant="ghost" size="icon-xs" aria-label={`${WEEKDAY_LABELS[day]} options`} className="-mr-1 shrink-0">
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40" onCloseAutoFocus={runOnceFocusIsBackOnTheTrigger}>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Dumbbell aria-hidden="true" className="mr-2 size-4 text-text-secondary" />
            Session
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {block.sessions.map(session => (
              <DropdownMenuItem key={session.id} onSelect={() => choose({ kind: 'session', sessionId: session.id })}>
                {session.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onSelect={() => choose({ kind: 'cardio', session: emptyCardioSession() })}>
          <HeartPulse aria-hidden="true" />
          Cardio
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => choose({ kind: 'rest' })}>
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
        <span className={CHIP_LABEL_CLASS}>{cardio.name}</span>
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
      <div className="flex items-center justify-between gap-1 pb-3">
        <h4 className="line-clamp-2 min-w-0 break-words">
          <DayName day={day} />
        </h4>
        <DayMenu
          block={block}
          day={day}
          onChoose={(choice, trigger) =>
            onRequest({
              title: dayTitle(block, day, choice),
              confirmLabel: 'Change day',
              lines: lostByChoice(block, day, choice),
              apply: () => onChange(blockWithDay(block, day, choice)),
              returnFocus: trigger,
            })
          }
        />
      </div>
      {session && (
        <button type="button" onClick={() => onOpenSession(session.id)} className={sessionChipClass(block.type)}>
          <span className={CHIP_LABEL_CLASS}>{session.name}</span>
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
    <section aria-labelledby={headingId} className="grid grid-cols-[minmax(0,1fr)] gap-2 lg:**:scroll-mt-[calc(var(--block-header-height)+0.5rem)]">
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
