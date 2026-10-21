import { Navigate, useParams } from 'react-router';
import { ClientNotFound } from '../../components/coach-portal/ClientNotFound';
import { ProgramDocumentSheet } from '../../components/program-view/ProgramDocumentSheet';
import { journeyProgramView } from '../../components/program-view/journeyProgramView';
import { usePrograms } from '../../context/ProgramContext';
import { useTraining } from '../../context/TrainingContext';
import { useJourneyClient } from '../../hooks/useJourneyClient';
import '../../../styles/print.css';

export function ClientProgramDocument() {
  const { id = '', version: requested } = useParams();
  const journey = useJourneyClient(id);
  const { programFor } = usePrograms();
  const { exercises } = useTraining();
  const program = journey ? programFor(journey.callId) : undefined;
  if (!journey || !program) return <ClientNotFound />;

  const programPath = `/coach/clients/${id}/program`;
  const version = program.versions.find(candidate => candidate.number === Number(requested));
  if (!version) return <Navigate to={programPath} replace />;

  const view = journeyProgramView({ journey, program, version, exercises, today: new Date() });
  const firstName = journey.identity.firstName;
  return <ProgramDocumentSheet view={view} backTo={programPath} backLabel={`Back to ${firstName}'s program`} />;
}
