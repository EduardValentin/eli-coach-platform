import { useTraining } from '../../../context/TrainingContext';
import type { ClientJourney } from '../../../domain/journey';
import type { Program, ProgramVersion } from '../../../domain/program';
import type { DocumentEditing } from '../../program-view/documentEditing';
import { journeyProgramView, journeyProgramViewDuringBlock } from '../../program-view/journeyProgramView';
import { ProgramDocument } from '../../program-view/ProgramDocument';
import type { EditorSection } from './editorSection';

type TextsWorkspaceProps = {
  section: EditorSection;
  journey: ClientJourney;
  program: Program;
  draft: ProgramVersion;
  today: Date;
  editing: DocumentEditing;
};

export function TextsWorkspace({ section, journey, program, draft, today, editing }: TextsWorkspaceProps) {
  const { exercises } = useTraining();
  const input = { journey, program, version: draft, exercises, today };
  const view =
    section.kind === 'block'
      ? journeyProgramViewDuringBlock({ ...input, blockId: section.blockId })
      : journeyProgramView({ ...input, fallbackDayOne: today });

  return (
    <div className="mx-auto w-full max-w-[210mm] overflow-clip border border-border bg-surface-base shadow-card">
      <ProgramDocument view={view} editing={editing} part={section.kind === 'block' ? 'block' : 'program-wide'} />
    </div>
  );
}
