import { isAfter, startOfDay } from 'date-fns';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { dayOneOf, usePrograms } from '../../../context/ProgramContext';
import { useTraining, type Exercise } from '../../../context/TrainingContext';
import { canStartWork, workStartDate } from '../../../domain/coachingSubscription';
import type { ClientJourney } from '../../../domain/journey';
import { CHECK_IN_DAY_KEY, collaborationPreference } from '../../../domain/onboardingAnswers';
import {
  currentVersion,
  type Block,
  type BlockType,
  type Program,
  type ProgramContent,
  type ProgramVersion,
} from '../../../domain/program';
import { currentPosition, weekdayFromOnboarding } from '../../../domain/programCalendar';
import { setupFromJourney, type ProgramSetup } from '../../../domain/programOnboarding';
import { blockingProblems, warnings, type RuleContext } from '../../../domain/programRules';
import { initialContent, newBlock } from '../../../domain/programSuggestions';
import { clientDetailPathForJourney } from '../../../utils/journeyLabels';
import { sectionFromHash, sectionHash, type EditorSection } from './editorSection';
import type { BlocksUpdate } from './PlanBlockList';

type EditorInput = { journey: ClientJourney; program: Program; draft: ProgramVersion; programPath: string };

function ruleContextFor(
  { journey, program, draft }: Omit<EditorInput, 'programPath'>,
  today: Date,
  exercises: readonly Exercise[],
): RuleContext {
  const subscription = journey.subscription;
  return {
    versionNumber: draft.number,
    publishDay: today,
    dayOne: dayOneOf(journey),
    preferredWeekday: weekdayFromOnboarding(collaborationPreference(journey.onboarding, CHECK_IN_DAY_KEY)),
    level: program.level,
    startDate: subscription && !canStartWork(subscription, today) ? workStartDate(subscription) : null,
    detailsPending: journey.stage === 'needs-details',
    publishedBlocks: currentVersion(program)?.content.plan.blocks ?? null,
    exercisesById: new Map(exercises.map(exercise => [exercise.id, exercise])),
  };
}

function defaultSection(draft: ProgramVersion, dayOne: Date | null, today: Date): EditorSection {
  const { blocks } = draft.content.plan;
  if (draft.number === 1) return { kind: 'plan' };
  const position = currentPosition(blocks, dayOne, today);
  return position.status === 'in-plan' ? { kind: 'block', blockId: blocks[position.blockIndex].id } : { kind: 'plan' };
}

export function useEditorState({ journey, program, draft, programPath }: EditorInput) {
  const { updateDraft, discardDraft, publishDraft } = usePrograms();
  const { exercises } = useTraining();
  const location = useLocation();
  const navigate = useNavigate();
  const today = new Date();
  const ctx = ruleContextFor({ journey, program, draft }, today, exercises);
  const { content } = draft;
  const selected = sectionFromHash(location.hash, content.plan.blocks) ?? defaultSection(draft, ctx.dayOne, today);
  const journeySetup = setupFromJourney(journey);
  const setup: ProgramSetup = {
    ...journeySetup,
    level: program.level,
    cycleMode: program.cycleMode,
    language: program.language,
    equipment: program.equipment,
    splitShape: content.plan.blocks[0]?.split.shape ?? journeySetup.splitShape,
  };

  function select(section: EditorSection) {
    navigate({ pathname: location.pathname, search: location.search, hash: sectionHash(section) }, { replace: true });
  }

  function updateBlocks(update: BlocksUpdate) {
    updateDraft(program.callId, current => ({ ...current, plan: { blocks: update(current.plan.blocks) } }));
  }

  function replaceContent(next: ProgramContent) {
    updateDraft(program.callId, () => next);
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

  function publish() {
    const outcome = publishDraft(program.callId, new Date());
    if (outcome.status === 'blocked') return;
    toast.success(`Version ${outcome.version.number} published`);
    navigate(programPath);
  }

  function discard() {
    discardDraft(program.callId);
    navigate(draft.number === 1 ? clientDetailPathForJourney(journey) : programPath);
  }

  return {
    today,
    ctx,
    selected,
    problems: blockingProblems(content, draft.whatChanged, ctx),
    warnings: warnings(content, ctx),
    opensOn: ctx.startDate && isAfter(startOfDay(ctx.startDate), startOfDay(today)) ? ctx.startDate : null,
    select,
    updateBlocks,
    replaceBlock,
    replaceContent,
    addBlock,
    removeBlock,
    applySuggestion,
    publish,
    discard,
  };
}
