import { useId } from 'react';
import type { LevelHint, Program, ProgramContent, ProgramLanguage } from '../../../domain/program';
import { SettingsRow, SettingsRows, SettingsSection } from '../../SettingsSection';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { OptionSelect, type Option } from './OptionSelect';

type SetupPatch = Partial<Pick<Program, 'level' | 'language'>>;

type HeaderSectionProps = {
  program: Program;
  content: ProgramContent;
  onContentChange: (content: ProgramContent) => void;
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

export function HeaderSection({ program, content, onContentChange, onSetupChange }: HeaderSectionProps) {
  const ids = {
    title: useId(),
    note: useId(),
    level: useId(),
    language: useId(),
  };
  const { header } = content;
  const languageFixed = program.versions.some(other => other.state === 'published');
  const change = (patch: Partial<ProgramContent['header']>) => onContentChange({ ...content, header: { ...header, ...patch } });

  return (
    <div className="grid gap-6">
      <SettingsSection headingId="header-heading" title="Intro" description="The top of her program page and the cover of her PDF.">
        <SettingsRows>
          <SettingsRow htmlFor={ids.title} title="Title" description="Shown on the PDF cover." layout="stacked">
            <Input id={ids.title} value={header.title} onChange={event => change({ title: event.target.value })} />
          </SettingsRow>
          <SettingsRow htmlFor={ids.note} title="Personal note" description="Shown as a note from you under her focus." layout="stacked">
            <Textarea id={ids.note} value={header.personalNote} onChange={event => change({ personalNote: event.target.value })} />
          </SettingsRow>
        </SettingsRows>
      </SettingsSection>
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
    </div>
  );
}
