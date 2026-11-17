import { FilePen, FileX } from 'lucide-react';
import { useParams } from 'react-router';
import { ClientNotFound } from '../../components/coach-portal/ClientNotFound';
import { useCoachPortalScope } from '../../components/coach-portal/useCoachPortalScope';
import {
  ProgramDocumentLoadState,
  ProgramDocumentNotice,
  ProgramDocumentPage,
  ProgramDocumentUnavailable,
} from '../../components/program-view/ProgramDocumentPage';
import { useProgramLookup } from '../../components/program-view/useProgramLookup';
import { journeyProgramView } from '../../components/program-view/journeyProgramView';
import { useTraining } from '../../context/TrainingContext';
import { useJourneyClient } from '../../hooks/useJourneyClient';
import '../../../styles/print.css';

export function ClientProgramDocument() {
  useCoachPortalScope();
  const { id = '', version: requested } = useParams();
  const journey = useJourneyClient(id);
  const lookup = useProgramLookup(journey?.callId ?? null);
  const { exercises } = useTraining();
  const toClients = { backTo: '/coach/clients', backLabel: 'Back to clients' };
  const programPath = `/coach/clients/${id}/program`;
  const programLabel = journey && `${journey.profile.identity.firstName}'s program`;
  const back = programLabel ? { backTo: programPath, backLabel: `Back to ${programLabel}` } : toClients;

  if (lookup.status === 'pending') return <ProgramDocumentLoadState {...back} load={lookup.load} onRetry={lookup.retry} />;
  if (!journey) {
    return (
      <ProgramDocumentNotice {...toClients}>
        <ClientNotFound />
      </ProgramDocumentNotice>
    );
  }

  const program = lookup.status === 'found' ? lookup.program : undefined;
  const version = program?.versions.find(candidate => candidate.number === Number(requested));
  if (!program || !version) {
    return (
      <ProgramDocumentUnavailable
        {...back}
        icon={FileX}
        title="This version isn't available"
        description="The link may be out of date. The program lists every version and its document."
        way={{ to: programPath, label: `Go to ${programLabel}` }}
      />
    );
  }

  if (version.state === 'draft') {
    return (
      <ProgramDocumentUnavailable
        {...back}
        icon={FilePen}
        title="A draft gets its document when you publish it"
        description={`Version ${version.number} is still a draft. Publish it and its document is ready to print.`}
        way={{ to: programPath, label: back.backLabel }}
      />
    );
  }

  const view = journeyProgramView({ journey, program, version, exercises, today: new Date() });
  return <ProgramDocumentPage {...back} view={view} />;
}
