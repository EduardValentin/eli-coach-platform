import { useId } from 'react';
import { usePrograms } from '../../../context/ProgramContext';
import { CYCLE_MODE_LABELS, type CycleMode } from '../../../domain/cycleMode';
import { SESSION_MINUTE_LABELS, TRAINING_DAY_LABELS, type CoachingFacts } from '../../../domain/clientProfile';
import type { ClientJourney } from '../../../domain/journey';
import type { LevelHint, Program, ProgramContent, ProgramLanguage, ProgramVersion } from '../../../domain/program';
import { SettingsRow, SettingsRows, SettingsSection } from '../../SettingsSection';
import { equipmentReading } from '../../client-profile/profileFields';
import { clientPronouns } from '../../../utils/journeyLabels';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { OptionSelect, type Option } from './OptionSelect';

type SetupPatch = Partial<Pick<Program, 'level' | 'cycleMode' | 'language'>>;

type HeaderSectionProps = {
  journey: ClientJourney;
  program: Program;
  version: ProgramVersion;
  content: ProgramContent;
  onContentChange: (content: ProgramContent) => void;
  onSetupChange: (patch: SetupPatch) => void;
};

const LEVELS: Option<LevelHint>[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];
const CYCLE_MODES: Option<CycleMode>[] = (['adapted', 'general'] as const).map(value => ({ value, label: CYCLE_MODE_LABELS[value] }));
const LANGUAGES: Option<ProgramLanguage>[] = [
  { value: 'en', label: 'English' },
  { value: 'ro', label: 'Romanian' },
];

function profileFacts(coaching: CoachingFacts | null): [string, string][] {
  if (!coaching) return [];

  const facts: [string, string | null][] = [
    ['Goal', coaching.primaryGoal],
    ['Equipment', equipmentReading(coaching.equipment)],
    ['Place', coaching.trainingPlace],
    ['Days per week', TRAINING_DAY_LABELS[coaching.trainingDays]],
    ['Minutes per session', SESSION_MINUTE_LABELS[coaching.sessionMinutes]],
    ['Limitations', coaching.limitations || null],
  ];
  return facts.filter((fact): fact is [string, string] => fact[1] !== null);
}

export function HeaderSection({ journey, program, version, content, onContentChange, onSetupChange }: HeaderSectionProps) {
  const { setWhatChanged } = usePrograms();
  const ids = {
    title: useId(),
    focus: useId(),
    changed: useId(),
    note: useId(),
    level: useId(),
    cycle: useId(),
    language: useId(),
  };
  const { header } = content;
  const languageFixed = program.versions.some(other => other.state === 'published');
  const change = (patch: Partial<ProgramContent['header']>) => onContentChange({ ...content, header: { ...header, ...patch } });

  return (
    <SettingsSection headingId="header-heading" title="Header & focus">
      <SettingsRows>
        <SettingsRow htmlFor={ids.title} title="Title" layout="stacked">
          <Input id={ids.title} value={header.title} onChange={event => change({ title: event.target.value })} />
        </SettingsRow>
        <SettingsRow htmlFor={ids.focus} title="Focus until the next check-in form" layout="stacked">
          <Textarea
            id={ids.focus}
            placeholder="e.g. consolidate technique on the main lifts"
            value={header.focus}
            onChange={event => change({ focus: event.target.value })}
          />
        </SettingsRow>
        <SettingsRow htmlFor={ids.changed} title="What changed and why" required={version.number >= 2} layout="stacked">
          <Textarea
            id={ids.changed}
            required={version.number >= 2}
            value={version.whatChanged}
            onChange={event => setWhatChanged(program.callId, event.target.value)}
          />
        </SettingsRow>
        <SettingsRow htmlFor={ids.note} title="Personal note" layout="stacked">
          <Textarea id={ids.note} value={header.personalNote} onChange={event => change({ personalNote: event.target.value })} />
        </SettingsRow>
        <SettingsRow title={`From ${clientPronouns(journey.profile.identity.gender).possessive.lower} profile`} layout="stacked">
          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[max-content_1fr]">
            {profileFacts(journey.profile.coaching).map(([term, detail]) => (
              <div key={term} className="contents">
                <dt className="text-text-secondary">{term}</dt>
                <dd className="text-text-primary">{detail}</dd>
              </div>
            ))}
          </dl>
        </SettingsRow>
        <SettingsRow htmlFor={ids.level} title="Level" layout="stacked">
          <OptionSelect id={ids.level} options={LEVELS} value={program.level} onChange={level => onSetupChange({ level })} />
        </SettingsRow>
        {journey.profile.identity.gender !== 'male' && (
          <SettingsRow htmlFor={ids.cycle} title="Cycle mode" layout="stacked">
            <OptionSelect id={ids.cycle} options={CYCLE_MODES} value={program.cycleMode} onChange={cycleMode => onSetupChange({ cycleMode })} />
          </SettingsRow>
        )}
        <SettingsRow htmlFor={ids.language} title="Language" layout="stacked">
          <OptionSelect
            id={ids.language}
            options={LANGUAGES}
            value={program.language}
            disabled={languageFixed}
            onChange={language => onSetupChange({ language })}
          />
        </SettingsRow>
      </SettingsRows>
    </SettingsSection>
  );
}
