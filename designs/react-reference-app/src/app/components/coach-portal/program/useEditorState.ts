import { useLocation, useNavigate } from 'react-router';
import { dayOneOf, usePrograms } from '../../../context/ProgramContext';
import { useTraining, type Exercise } from '../../../context/TrainingContext';
import { canStartWork, workStartDate } from '../../../domain/coachingSubscription';
import type { ClientJourney } from '../../../domain/journey';
import { CHECK_IN_DAY_KEY, collaborationPreference } from '../../../domain/onboardingAnswers';
import type { Block, BlockType, Program, ProgramVersion } from '../../../domain/program';
import { currentPosition, weekdayFromOnboarding } from '../../../domain/programCalendar';
import { setupFromJourney, type ProgramSetup } from '../../../domain/programOnboarding';
import { blockingProblems, warnings, type RuleContext } from '../../../domain/programRules';
import { initialContent, newBlock } from '../../../domain/programSuggestions';
import { clientDetailPathForJourney } from '../../../utils/journeyLabels';
import { sectionFromHash, sectionHash, type EditorSection } from './editorSection';
import type { BlocksUpdate } from './PlanOverview';

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
  const setup: ProgramSetup = { ...setupFromJourney(journey), level: program.level, cycleMode: program.cycleMode, language: program.language };

  function select(section: EditorSection) {
    navigate({ pathname: location.pathname, search: location.search, hash: sectionHash(section) }, { replace: true });
  }

  function updateBlocks(update: BlocksUpdate) {
    updateDraft(program.callId, current => ({ ...current, plan: { blocks: update(current.plan.blocks) } }));
  }

  function replaceBlock(block: Block) {
    updateBlocks(blocks => blocks.map(other => (other.id === block.id ? block : other)));
  }

  function addBlock(type: BlockType, weeks: number) {
    const block = newBlock(type, weeks, setup, program.language, content.plan.blocks.at(-1));
    updateBlocks(blocks => [...blocks, block]);
    select({ kind: 'block', blockId: block.id });
  }

  function applySuggestion() {
    updateBlocks(() => initialContent(setup).plan.blocks);
  }

  function publish() {
    if (publishDraft(program.callId, new Date()).status === 'published') navigate(programPath);
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
    warningsCount: warnings(content, ctx).length,
    select,
    updateBlocks,
    replaceBlock,
    addBlock,
    applySuggestion,
    publish,
    discard,
  };
}
