import { isAfter, startOfDay } from 'date-fns';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAppState } from '../../../context/AppContext';
import { usePrograms } from '../../../context/ProgramContext';
import { useTraining } from '../../../context/TrainingContext';
import type { ClientJourney } from '../../../domain/journey';
import type { Block, BlockType, Program, ProgramVersion } from '../../../domain/program';
import { currentPosition } from '../../../domain/programCalendar';
import { libraryEquipmentFor, setupFromJourney, type ProgramSetup } from '../../../domain/programOnboarding';
import { blockingProblems, ruleContextFor, warnings } from '../../../domain/programRules';
import { versionWithStandardText, versionWithText } from '../../../domain/programTexts';
import { initialContent, newBlock } from '../../../domain/programSuggestions';
import { writeProgramThroughServer } from '../../../services/programWriteService';
import { clientDetailPathForJourney } from '../../../utils/journeyLabels';
import type { DocumentEditing } from '../../program-view/documentEditing';
import { modeOfPath, modePath, sectionFromHash, sectionHash, type EditorMode, type EditorSection } from './editorSection';
import type { BlocksUpdate } from './PlanBlockList';
import { draftStateOf } from './unpublishableDraft';

export type WriteResult = 'written' | 'failed';

type EditorInput = { journey: ClientJourney; program: Program; draft: ProgramVersion; programPath: string };

function defaultSection(draft: ProgramVersion, dayOne: Date | null, today: Date): EditorSection {
  const { blocks } = draft.content.plan;
  if (draft.number === 1) return { kind: 'plan' };
  const position = currentPosition(blocks, dayOne, today);
  return position.status === 'in-plan' ? { kind: 'block', blockId: blocks[position.blockIndex].id } : { kind: 'plan' };
}

export function useEditorState({ journey, program, draft, programPath }: EditorInput) {
  const { updateDraft, updateDraftVersion, discardDraft, publishDraft } = usePrograms();
  const { exercises } = useTraining();
  const { appState } = useAppState();
  const location = useLocation();
  const navigate = useNavigate();
  const today = new Date();
  const ruleContext = ruleContextFor({ journey, program, draft, today, exercises });
  const { content } = draft;
  const draftPath = `${programPath}/draft`;
  const mode = modeOfPath(location.pathname);
  const selected = sectionFromHash(location.hash, content.plan.blocks) ?? defaultSection(draft, ruleContext.dayOne, today);
  const equipment = libraryEquipmentFor(journey.profile.coaching?.equipment ?? []);
  const journeySetup = setupFromJourney(journey);
  const setup: ProgramSetup = {
    ...journeySetup,
    level: program.level,
    language: program.language,
    splitShape: content.plan.blocks[0]?.split.shape ?? journeySetup.splitShape,
  };

  function locationOf(targetMode: EditorMode, section: EditorSection) {
    return { pathname: modePath(draftPath, targetMode), search: location.search, hash: sectionHash(section) };
  }

  function select(section: EditorSection) {
    navigate(locationOf(mode, section), { replace: true });
  }

  function openInStructure(section: EditorSection) {
    navigate(locationOf('structure', section), { replace: mode === 'structure' });
  }

  function updateBlocks(update: BlocksUpdate) {
    updateDraft(program.callId, current => ({ ...current, plan: { blocks: update(current.plan.blocks) } }));
  }

  function replaceBlock(block: Block) {
    updateBlocks(blocks => blocks.map(other => (other.id === block.id ? block : other)));
  }

  function addBlock(type: BlockType, weeks: number) {
    const block = newBlock(type, weeks, { setup, library: exercises, previous: content.plan.blocks.at(-1) });
    updateBlocks(blocks => [...blocks, block]);
    select({ kind: 'block', blockId: block.id });
  }

  function removeBlock(blockId: string) {
    updateBlocks(blocks => blocks.filter(block => block.id !== blockId));
    select({ kind: 'plan' });
  }

  function applySuggestion() {
    updateBlocks(() => initialContent(setup, exercises).plan.blocks);
  }

  const textEditing: DocumentEditing = {
    write: (target, text) => updateDraftVersion(program.callId, version => versionWithText(version, target, text)),
    reset: target => updateDraftVersion(program.callId, version => versionWithStandardText(version, target, program.language)),
  };

  function publish(): WriteResult {
    try {
      const outcome = writeProgramThroughServer(appState.programWrite, () => publishDraft(program.callId, new Date()));
      if (outcome.status !== 'published') return 'failed';
      toast.success(`Version ${outcome.version.number} published`);
    } catch {
      return 'failed';
    }
    navigate(programPath);
    return 'written';
  }

  function discard(): WriteResult {
    try {
      writeProgramThroughServer(appState.programWrite, () => discardDraft(program.callId));
    } catch {
      return 'failed';
    }
    navigate(draft.number === 1 ? clientDetailPathForJourney(journey) : programPath);
    return 'written';
  }

  return {
    today,
    ruleContext,
    equipment,
    mode,
    selected,
    locationOf,
    problems: blockingProblems(content, ruleContext),
    warnings: warnings(content, ruleContext),
    opensOn: ruleContext.startDate && isAfter(startOfDay(ruleContext.startDate), startOfDay(today)) ? ruleContext.startDate : null,
    draftState: draftStateOf(journey, today),
    select,
    openInStructure,
    updateBlocks,
    replaceBlock,
    textEditing,
    addBlock,
    removeBlock,
    applySuggestion,
    publish,
    discard,
  };
}
