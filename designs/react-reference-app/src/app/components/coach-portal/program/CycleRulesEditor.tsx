import { useEffect } from 'react';
import { CalendarDays, Plus, Trash2 } from 'lucide-react';
import { newId, type CycleAdjustment, type CycleRule } from '../../../domain/program';
import { EmptyState } from '../../EmptyState';
import { SettingsBody, SettingsSection } from '../../SettingsSection';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { OptionSelect, type Option } from './OptionSelect';

type CycleRulesEditorProps = { rules: CycleRule[]; symptoms: string[]; onChange: (rules: CycleRule[]) => void };

const CELL_CLASS = 'px-3 py-2';
const ADJUSTMENTS: Option<CycleAdjustment>[] = [
  { value: 'none', label: 'No change' },
  { value: 'rir-plus-one', label: 'RIR +1' },
  { value: 'one-set-less', label: 'One set less' },
  { value: 'hiit-to-liss', label: 'HIIT → LISS' },
  { value: 'low-energy-session', label: 'Low-energy session' },
];

export function CycleRulesEditor({ rules, symptoms, onChange }: CycleRulesEditorProps) {
  useEffect(() => {
    if (rules.length === 0 && symptoms.length > 0) {
      onChange(symptoms.map(symptomPeriod => ({ id: newId(), symptomPeriod, adjustment: 'none' })));
    }
  }, []);

  const replace = (rule: CycleRule) => onChange(rules.map(other => (other.id === rule.id ? rule : other)));

  return (
    <SettingsSection
      headingId="cycle-heading"
      title="Cycle rules"
      footer={
        <Button variant="outline" onClick={() => onChange([...rules, { id: newId(), symptomPeriod: '', adjustment: 'none' }])}>
          <Plus aria-hidden="true" />
          Add period
        </Button>
      }
    >
      {rules.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No periods yet"
          description="No recurring symptoms declared; add a period when her check-in forms show one."
        />
      ) : (
        <SettingsBody>
          <Table aria-label="Cycle rules">
            <TableHeader>
              <TableRow>
                <TableHead className={CELL_CLASS}>Symptom period</TableHead>
                <TableHead className={CELL_CLASS}>Adjustment</TableHead>
                <TableHead className={CELL_CLASS}>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule, index) => (
                <TableRow key={rule.id}>
                  <TableCell className={CELL_CLASS}>
                    <Input
                      size="sm"
                      aria-label={`Symptom period ${index + 1}`}
                      value={rule.symptomPeriod}
                      onChange={event => replace({ ...rule, symptomPeriod: event.target.value })}
                    />
                  </TableCell>
                  <TableCell className={CELL_CLASS}>
                    <OptionSelect
                      size="sm"
                      label={`Adjustment ${index + 1}`}
                      options={ADJUSTMENTS}
                      value={rule.adjustment}
                      onChange={adjustment => replace({ ...rule, adjustment })}
                    />
                  </TableCell>
                  <TableCell className={`${CELL_CLASS} text-right`}>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove period ${index + 1}`}
                      onClick={() => onChange(rules.filter(other => other.id !== rule.id))}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SettingsBody>
      )}
    </SettingsSection>
  );
}
