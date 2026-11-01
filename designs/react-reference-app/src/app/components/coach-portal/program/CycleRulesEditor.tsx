import { useEffect } from 'react';
import { CalendarDays, Plus, Trash2 } from 'lucide-react';
import { newId, type CycleAdjustment, type CycleRule, type ProgramContent, type ProgramLanguage } from '../../../domain/program';
import { guideText, templateText, withGuideText, withoutGuideText } from '../../../domain/programTemplates';
import { EmptyState } from '../../EmptyState';
import { SettingsBody, SettingsSection } from '../../SettingsSection';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { ClientTextEditor } from './ClientTextEditor';
import { OptionSelect, type Option } from './OptionSelect';

type CycleRulesEditorProps = {
  content: ProgramContent;
  language: ProgramLanguage;
  symptoms: string[];
  onChange: (content: ProgramContent) => void;
};

const CELL_CLASS = 'px-3 py-2';
const ADJUSTMENTS: Option<CycleAdjustment>[] = [
  { value: 'none', label: 'No change' },
  { value: 'rir-plus-one', label: 'RIR +1' },
  { value: 'one-set-less', label: 'One set less' },
  { value: 'hiit-to-liss', label: 'HIIT → LISS' },
  { value: 'low-energy-session', label: 'Low-energy session' },
];

function CycleTextSection({ content, language, onChange }: Omit<CycleRulesEditorProps, 'symptoms'>) {
  const write = (text: string) =>
    onChange({
      ...content,
      guideTexts: withGuideText(content.guideTexts, 'cycle', text),
    });
  const reset = () =>
    onChange({
      ...content,
      guideTexts: withoutGuideText(content.guideTexts, 'cycle'),
    });
  return (
    <SettingsSection
      headingId="cycle-text-heading"
      title="What the client reads"
      description="Shown under “Listening to your cycle”, followed by each period whose adjustment is not “No change”."
    >
      <SettingsBody>
        <ClientTextEditor
          label="Cycle text"
          value={guideText(content.guideTexts, 'cycle', language)}
          template={templateText('cycle', language)}
          onChange={write}
          onReset={reset}
        />
      </SettingsBody>
    </SettingsSection>
  );
}

export function CycleRulesEditor({ content, language, symptoms, onChange }: CycleRulesEditorProps) {
  const rules = content.cycleRules;
  const setRules = (cycleRules: CycleRule[]) => onChange({ ...content, cycleRules });
  useEffect(() => {
    if (rules.length === 0 && symptoms.length > 0) {
      setRules(
        symptoms.map(symptomPeriod => ({
          id: newId(),
          symptomPeriod,
          adjustment: 'none',
        })),
      );
    }
  }, []);

  const replace = (rule: CycleRule) => setRules(rules.map(other => (other.id === rule.id ? rule : other)));

  return (
    <div className="grid gap-6">
      <SettingsSection
        headingId="cycle-heading"
        title="Cycle rules"
        description="How the client adjusts training on days when symptoms hit."
        footer={
          <Button variant="outline" onClick={() => setRules([...rules, { id: newId(), symptomPeriod: '', adjustment: 'none' }])}>
            <Plus aria-hidden="true" />
            Add period
          </Button>
        }
      >
        {rules.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No periods yet" description="No recurring symptoms declared." />
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
                        onChange={event =>
                          replace({
                            ...rule,
                            symptomPeriod: event.target.value,
                          })
                        }
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
                        onClick={() => setRules(rules.filter(other => other.id !== rule.id))}
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
      <CycleTextSection content={content} language={language} onChange={onChange} />
    </div>
  );
}
