import { ClipboardList } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { SUPPORTING_LINES } from '../../components/client-portal/ProgramStatusCard';
import { ClientProgramBody } from '../../components/program-view/ClientProgramBody';
import { journeyProgramView } from '../../components/program-view/journeyProgramView';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import { usePrograms } from '../../context/ProgramContext';
import { useTraining } from '../../context/TrainingContext';
import { currentVersion } from '../../domain/program';
import { formatJourneyDate } from '../../utils/journeyLabels';

const EMPTY_STATE_FALLBACK = 'Your coach is building it from your answers.';

export function ClientProgram() {
  const { demoJourney } = useClientJourneys();
  const { programFor } = usePrograms();
  const { exercises } = useTraining();
  const program = programFor(demoJourney.callId);
  const version = program && currentVersion(program);

  if (!program || !version) {
    return (
      <div data-parity-root="ClientProgram">
        <PortalPageHeader title="Program" />
        <EmptyState
          icon={ClipboardList}
          title="Your program is on its way"
          description={SUPPORTING_LINES[demoJourney.stage] ?? EMPTY_STATE_FALLBACK}
        />
      </div>
    );
  }

  const view = journeyProgramView({ journey: demoJourney, program, version, exercises, today: new Date() });

  return (
    <div data-parity-root="ClientProgram" className="grid gap-6">
      <PortalPageHeader
        title="Program"
        subtitle={`Version ${version.number}${version.publishedAt ? ` · ${formatJourneyDate(version.publishedAt)}` : ''}`}
      />
      <ClientProgramBody view={view} />
    </div>
  );
}
