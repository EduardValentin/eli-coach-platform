import { Label } from "~/shared/design-system/primitives";
import { useId } from "react";

import type {
  ClientLevel,
  ProgramLanguage,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

import { OptionSelect, type Option } from "./option-select";

export type SettingsPatch = { level?: ClientLevel; language?: ProgramLanguage };

type ProgramSettingsProps = {
  level: ClientLevel;
  language: ProgramLanguage;
  onChange: (patch: SettingsPatch) => void;
};

const LEVELS: Option<ClientLevel>[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const LANGUAGES: Option<ProgramLanguage>[] = [
  { value: "en", label: "English" },
  { value: "ro", label: "Romanian" },
];

const FIELD_CLASS =
  "grid min-w-36 flex-1 gap-1 sm:flex sm:flex-none sm:items-center sm:gap-2";

const SELECT_CLASS = "w-full min-w-0 sm:w-auto sm:min-w-36";

export function ProgramSettings({
  level,
  language,
  onChange,
}: ProgramSettingsProps) {
  const ids = { level: useId(), language: useId() };

  return (
    <div
      aria-label="Program settings"
      className="flex w-full flex-wrap items-center gap-4 sm:w-auto"
      role="group"
    >
      <div className={FIELD_CLASS} data-parity="settings-level-field">
        <Label className="text-text-secondary" htmlFor={ids.level}>
          Level
        </Label>
        <div className={SELECT_CLASS} data-parity="settings-level-control">
          <OptionSelect
            id={ids.level}
            onChange={(next) => onChange({ level: next })}
            options={LEVELS}
            value={level}
          />
        </div>
      </div>
      <div className={FIELD_CLASS} data-parity="settings-language-field">
        <Label className="text-text-secondary" htmlFor={ids.language}>
          Language
        </Label>
        <div className={SELECT_CLASS} data-parity="settings-language-control">
          <OptionSelect
            id={ids.language}
            onChange={(next) => onChange({ language: next })}
            options={LANGUAGES}
            value={language}
          />
        </div>
      </div>
    </div>
  );
}
