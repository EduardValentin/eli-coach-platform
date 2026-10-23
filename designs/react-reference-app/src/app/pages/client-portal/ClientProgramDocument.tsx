import { Navigate, useParams } from 'react-router';
import { ProgramDocumentSheet } from '../../components/program-view/ProgramDocumentSheet';
import { journeyProgramView } from '../../components/program-view/journeyProgramView';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import { usePrograms } from '../../context/ProgramContext';
import { useTraining } from '../../context/TrainingContext';
import { currentVersion } from '../../domain/program';
import '../../../styles/print.css';

const PROGRAM_PATH = '/portal/program';

export function ClientProgramDocument() {
  const { version: requested } = useParams();
  const { demoJourney } = useClientJourneys();
  const { hydrated, programFor } = usePrograms();
  const { exercises } = useTraining();
  const program = programFor(demoJourney.callId);
  const version = requested
    ? program?.versions.find(candidate => candidate.number === Number(requested) && candidate.state !== 'draft')
    : program && currentVersion(program);

  if (!hydrated) return null;
  if (!program || !version) return <Navigate to={PROGRAM_PATH} replace />;

  const view = journeyProgramView({ journey: demoJourney, program, version, exercises, today: new Date() });
  return <ProgramDocumentSheet view={view} backTo={PROGRAM_PATH} backLabel="Back to your program" />;
}
