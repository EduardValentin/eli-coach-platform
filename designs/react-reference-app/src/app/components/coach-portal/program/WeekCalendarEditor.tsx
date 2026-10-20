import { WEEKDAYS, type Block, type CalendarEntry, type Weekday } from '../../../domain/program';
import { LABEL_CLASS } from '../../typography';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { cn } from '../../ui/utils';
import { CARDIO_TYPE_LABELS, WEEKDAY_LABELS } from './program-constants';

type WeekCalendarEditorProps = { block: Block; onChange: (block: Block) => void };

const REST_VALUE = 'rest';

function entryValue(entry: CalendarEntry): string {
  if (entry.kind === 'session') return `session:${entry.sessionId}`;
  if (entry.kind === 'cardio') return `cardio:${entry.cardioId}`;
  return REST_VALUE;
}

function entryOf(value: string): CalendarEntry {
  const [kind, id] = value.split(':');
  if (kind === 'session') return { kind: 'session', sessionId: id };
  if (kind === 'cardio') return { kind: 'cardio', cardioId: id };
  return { kind: 'rest' };
}

function placed(calendar: Block['calendar'], day: Weekday, value: string): Block['calendar'] {
  const moved = Object.fromEntries(
    WEEKDAYS.map(other => {
      if (other === day) return [other, entryOf(value)];
      const current = calendar[other];
      return [other, value !== REST_VALUE && entryValue(current) === value ? { kind: 'rest' } : current];
    }),
  );
  return moved as Block['calendar'];
}

export function WeekCalendarEditor({ block, onChange }: WeekCalendarEditorProps) {
  return (
    <fieldset className="grid gap-2">
      <legend className={cn(LABEL_CLASS, 'mb-2')}>Week</legend>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {WEEKDAYS.map(day => {
          const entry = block.calendar[day];
          return (
            <li key={day} className="grid gap-1">
              <span aria-hidden="true" className="text-xs font-medium text-text-secondary">
                {WEEKDAY_LABELS[day].slice(0, 3)}
              </span>
              <Select
                value={entryValue(entry)}
                onValueChange={value => onChange({ ...block, calendar: placed(block.calendar, day, value) })}
              >
                <SelectTrigger
                  size="sm"
                  aria-label={WEEKDAY_LABELS[day]}
                  className={cn({ 'bg-surface-quiet text-text-secondary': entry.kind === 'rest' })}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {block.sessions.map(session => (
                    <SelectItem key={session.id} value={`session:${session.id}`}>
                      {session.name}
                    </SelectItem>
                  ))}
                  {block.cardioSessions.map(cardio => (
                    <SelectItem key={cardio.id} value={`cardio:${cardio.id}`}>
                      {`${CARDIO_TYPE_LABELS[cardio.type]} ${cardio.minutes} min`}
                    </SelectItem>
                  ))}
                  <SelectItem value={REST_VALUE}>Rest</SelectItem>
                </SelectContent>
              </Select>
            </li>
          );
        })}
      </ol>
    </fieldset>
  );
}
