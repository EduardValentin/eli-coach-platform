import { useId, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { WEEKDAYS, newId, type Block, type CardioSession, type CardioType } from '../../../domain/program';
import { CARDIO_INTENSITY_TEXT, STEPS_STEP } from '../../../domain/programDefaults';
import { SettingsRow } from '../../SettingsSection';
import { Button } from '../../ui/button';
import { cardVariants } from '../../ui/card';
import { Input } from '../../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { WIDGET_TITLE_CLASS } from '../../typography';
import { OptionSelect, type Option } from './OptionSelect';
import { CARDIO_TYPE_LABELS, WEEKDAY_LABELS } from './program-constants';

type CardioEditorProps = { block: Block; onChange: (block: Block) => void };

const CELL_CLASS = 'px-3 py-2';
const MIN_STEPS = 4000;
const MAX_STEPS = 12000;
const CARDIO_TYPES = Object.keys(CARDIO_TYPE_LABELS) as CardioType[];
const TYPE_OPTIONS: Option<CardioType>[] = CARDIO_TYPES.map(value => ({ value, label: CARDIO_TYPE_LABELS[value] }));
const WEEKDAY_OPTIONS = WEEKDAYS.map(value => ({ value, label: WEEKDAY_LABELS[value] }));
const PLACEMENT_OPTIONS: Option<CardioSession['placement']>[] = [
  { value: 'separate', label: 'Separate day' },
  { value: 'after-session', label: 'After session' },
];

function stepOptions(current: number): Option<number>[] {
  const values = new Set<number>([current]);
  for (let steps = MIN_STEPS; steps <= MAX_STEPS; steps += STEPS_STEP) values.add(steps);
  return [...values].sort((a, b) => a - b).map(value => ({ value, label: value.toLocaleString('en-US') }));
}

function placedMinutes(block: Block): number {
  const placedIds = new Set(Object.values(block.calendar).flatMap(entry => (entry.kind === 'cardio' ? [entry.cardioId] : [])));
  return block.cardioSessions.filter(cardio => placedIds.has(cardio.id)).reduce((sum, cardio) => sum + cardio.minutes, 0);
}

function withoutCardio(block: Block, cardioId: string): Block {
  const calendar = Object.fromEntries(
    WEEKDAYS.map(day => {
      const entry = block.calendar[day];
      return [day, entry.kind === 'cardio' && entry.cardioId === cardioId ? { kind: 'rest' } : entry];
    }),
  ) as Block['calendar'];
  return { ...block, calendar, cardioSessions: block.cardioSessions.filter(cardio => cardio.id !== cardioId) };
}

function newCardio(block: Block): CardioSession {
  return {
    id: newId(),
    type: 'liss',
    minutes: 30,
    intensityText: CARDIO_INTENSITY_TEXT.liss,
    weekday: WEEKDAYS.find(day => block.calendar[day].kind === 'rest') ?? 'mon',
    placement: 'separate',
  };
}

export function CardioEditor({ block, onChange }: CardioEditorProps) {
  const headingId = useId();
  const stepsId = useId();
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const replace = (cardio: CardioSession) =>
    onChange({ ...block, cardioSessions: block.cardioSessions.map(other => (other.id === cardio.id ? cardio : other)) });

  function changeType(cardio: CardioSession, type: CardioType) {
    replace({ ...cardio, type, intensityText: touched.has(cardio.id) ? cardio.intensityText : CARDIO_INTENSITY_TEXT[type] });
  }

  function changeIntensity(cardio: CardioSession, intensityText: string) {
    setTouched(current => new Set(current).add(cardio.id));
    replace({ ...cardio, intensityText });
  }

  return (
    <section aria-labelledby={headingId} className={cardVariants({ variant: 'panel' })}>
      <div className="border-b border-border-subtle px-5 py-4 sm:px-6">
        <h3 id={headingId} className={WIDGET_TITLE_CLASS}>
          Cardio and steps
        </h3>
      </div>
      <SettingsRow
        htmlFor={stepsId}
        title="Daily steps"
        hint="+1,000–2,000 per version towards 8,000–10,000"
      >
        <OptionSelect
          id={stepsId}
          options={stepOptions(block.dailySteps)}
          value={block.dailySteps}
          onChange={dailySteps => onChange({ ...block, dailySteps })}
        />
      </SettingsRow>
      <div className="grid gap-3 border-t border-border-subtle px-5 py-5 sm:px-6">
        {block.cardioSessions.length > 0 && (
          <Table aria-label="Cardio sessions">
            <TableHeader>
              <TableRow>
                <TableHead className={CELL_CLASS}>Type</TableHead>
                <TableHead className={CELL_CLASS}>Minutes</TableHead>
                <TableHead className={CELL_CLASS}>Intensity</TableHead>
                <TableHead className={CELL_CLASS}>Weekday</TableHead>
                <TableHead className={CELL_CLASS}>Placement</TableHead>
                <TableHead className={CELL_CLASS}>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {block.cardioSessions.map((cardio, index) => {
                const n = index + 1;
                return (
                  <TableRow key={cardio.id}>
                    <TableCell className={CELL_CLASS}>
                      <OptionSelect size="sm" label={`Type of cardio ${n}`} options={TYPE_OPTIONS} value={cardio.type} onChange={type => changeType(cardio, type)} />
                    </TableCell>
                    <TableCell className={CELL_CLASS}>
                      <Input
                        size="sm"
                        type="number"
                        min={1}
                        aria-label={`Minutes of cardio ${n}`}
                        value={cardio.minutes}
                        onChange={event => replace({ ...cardio, minutes: Number(event.target.value) })}
                      />
                    </TableCell>
                    <TableCell className={CELL_CLASS}>
                      <Input
                        size="sm"
                        aria-label={`Intensity of cardio ${n}`}
                        value={cardio.intensityText}
                        onChange={event => changeIntensity(cardio, event.target.value)}
                      />
                    </TableCell>
                    <TableCell className={CELL_CLASS}>
                      <OptionSelect size="sm" label={`Weekday of cardio ${n}`} options={WEEKDAY_OPTIONS} value={cardio.weekday} onChange={weekday => replace({ ...cardio, weekday })} />
                    </TableCell>
                    <TableCell className={CELL_CLASS}>
                      <OptionSelect size="sm" label={`Placement of cardio ${n}`} options={PLACEMENT_OPTIONS} value={cardio.placement} onChange={placement => replace({ ...cardio, placement })} />
                    </TableCell>
                    <TableCell className={`${CELL_CLASS} text-right`}>
                      <Button variant="ghost" size="icon-sm" aria-label={`Remove cardio ${n}`} onClick={() => onChange(withoutCardio(block, cardio.id))}>
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => onChange({ ...block, cardioSessions: [...block.cardioSessions, newCardio(block)] })}>
            <Plus aria-hidden="true" />
            Add cardio session
          </Button>
          <p className="text-sm tabular-nums text-text-secondary">
            {`${placedMinutes(block)} min of cardio this week · WHO suggests 150–300 min moderate`}
          </p>
        </div>
      </div>
    </section>
  );
}
