import { useId } from 'react';
import { Info } from 'lucide-react';
import type { LevelHint, Program, ProgramLanguage } from '../../../domain/program';
import { IconHint } from '../../IconHint';
import { Label } from '../../ui/label';
import { OptionSelect, type Option } from './OptionSelect';

type SettingsPatch = Partial<Pick<Program, 'level' | 'language'>>;

type ProgramSettingsProps = {
  program: Program;
  onChange: (patch: SettingsPatch) => void;
};

const LEVELS: Option<LevelHint>[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];
const LANGUAGES: Option<ProgramLanguage>[] = [
  { value: 'en', label: 'English' },
  { value: 'ro', label: 'Romanian' },
];

const FIELD_CLASS = 'grid gap-1 sm:flex sm:items-center sm:gap-2';
const SELECT_CLASS = 'sm:w-36';
const LANGUAGE_FIXED_REASON = 'Fixed once a version is published';

export function ProgramSettings({ program, onChange }: ProgramSettingsProps) {
  const ids = { level: useId(), language: useId() };
  const languageFixed = program.versions.some(other => other.state === 'published');

  return (
    <div role="group" aria-label="Program settings" className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:items-center sm:gap-5">
      <div className={FIELD_CLASS}>
        <Label htmlFor={ids.level} className="text-text-secondary">
          Level
        </Label>
        <div className={SELECT_CLASS}>
          <OptionSelect id={ids.level} size="sm" options={LEVELS} value={program.level} onChange={level => onChange({ level })} />
        </div>
      </div>
      {languageFixed ? (
        <div className={FIELD_CLASS}>
          <span className="flex items-center gap-3">
            <span className="text-sm font-medium text-text-secondary">Language</span>
            <IconHint label="Why the language is fixed" icon={<Info aria-hidden="true" size={14} />} size="compact" tone="muted">
              {LANGUAGE_FIXED_REASON}
            </IconHint>
          </span>
          <span className="flex min-h-10 items-center text-sm font-medium text-text-primary sm:w-36">{LANGUAGES.find(option => option.value === program.language)?.label}</span>
        </div>
      ) : (
        <div className={FIELD_CLASS}>
          <Label htmlFor={ids.language} className="text-text-secondary">
            Language
          </Label>
          <div className={SELECT_CLASS}>
            <OptionSelect id={ids.language} size="sm" options={LANGUAGES} value={program.language} onChange={language => onChange({ language })} />
          </div>
        </div>
      )}
    </div>
  );
}
