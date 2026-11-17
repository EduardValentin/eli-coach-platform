import { ClipboardList, FileX } from 'lucide-react';
import { useParams } from 'react-router';
import { SUPPORTING_LINES } from '../../components/client-portal/ProgramStatusCard';
import {
  ProgramDocumentLoadState,
  ProgramDocumentPage,
  ProgramDocumentUnavailable,
} from '../../components/program-view/ProgramDocumentPage';
import { useProgramLookup } from '../../components/program-view/useProgramLookup';
import { journeyProgramView } from '../../components/program-view/journeyProgramView';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import { useTraining } from '../../context/TrainingContext';
import { currentVersion, type Program } from '../../domain/program';
import '../../../styles/print.css';

const PROGRAM_PATH = '/portal/program';
const BACK = { backTo: PROGRAM_PATH, backLabel: 'Back to your program' };
const ON_ITS_WAY_FALLBACK = 'Your coach is building it from your answers.';

function publishedVersion(program: Program, requested: string) {
  return program.versions.find(candidate => candidate.number === Number(requested) && candidate.state !== 'draft');
}

export function ClientProgramDocument() {
  const { version: requested } = useParams();
  const { demoJourney } = useClientJourneys();
  const lookup = useProgramLookup(demoJourney.callId);
  const { exercises } = useTraining();

  if (lookup.status === 'pending') return <ProgramDocumentLoadState {...BACK} load={lookup.load} onRetry={lookup.retry} />;
  const program = lookup.status === 'found' ? lookup.program : undefined;

  const version = program && (requested === undefined ? currentVersion(program) : publishedVersion(program, requested));

  if (!program || (requested === undefined && !version)) {
    return (
      <ProgramDocumentUnavailable
        {...BACK}
        icon={ClipboardList}
        title="Your program is on its way"
        description={SUPPORTING_LINES[demoJourney.stage] ?? ON_ITS_WAY_FALLBACK}
        way={{ to: PROGRAM_PATH, label: 'Back to your program' }}
      />
    );
  }

  if (!version) {
    return (
      <ProgramDocumentUnavailable
        {...BACK}
        icon={FileX}
        title="This version isn't available"
        description="The link may be out of date. Your program shows the versions you can download."
        way={{ to: PROGRAM_PATH, label: 'Go to your program' }}
      />
    );
  }

  const view = journeyProgramView({ journey: demoJourney, program, version, exercises, today: new Date() });
  return <ProgramDocumentPage {...BACK} view={view} />;
}
