import { useId } from 'react';
import type { LevelHint, Program, ProgramLanguage } from '../../../domain/program';
import { SettingsRow, SettingsRows, SettingsSection } from '../../SettingsSection';
import { OptionSelect, type Option } from './OptionSelect';

type SetupPatch = Partial<Pick<Program, 'level' | 'language'>>;

type SetupSectionProps = {
  program: Program;
  onSetupChange: (patch: SetupPatch) => void;
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

export function SetupSection({ program, onSetupChange }: SetupSectionProps) {
  const ids = { level: useId(), language: useId() };
  const languageFixed = program.versions.some(other => other.state === 'published');

  return (
    <SettingsSection headingId="setup-heading" title="Setup">
      <SettingsRows>
        <SettingsRow htmlFor={ids.level} title="Level" layout="stacked">
          <OptionSelect id={ids.level} options={LEVELS} value={program.level} onChange={level => onSetupChange({ level })} />
        </SettingsRow>
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
