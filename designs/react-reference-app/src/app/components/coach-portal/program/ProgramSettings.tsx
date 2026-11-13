import { useId } from 'react';
import type { LevelHint, Program, ProgramLanguage } from '../../../domain/program';
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
      <div className={FIELD_CLASS}>
        <Label htmlFor={ids.language} className="text-text-secondary">
          Language
        </Label>
        <div className={SELECT_CLASS}>
          <OptionSelect
            id={ids.language}
            size="sm"
            options={LANGUAGES}
            value={program.language}
            disabled={languageFixed}
            onChange={language => onChange({ language })}
          />
        </div>
      </div>
    </div>
  );
}
