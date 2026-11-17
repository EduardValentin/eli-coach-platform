import { ClipboardList, Download } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '../../components/EmptyState';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { ClientProgramView } from '../../components/client-portal/ClientProgramView';
import { SUPPORTING_LINES } from '../../components/client-portal/ProgramStatusCard';
import { journeyProgramView } from '../../components/program-view/journeyProgramView';
import { ProgramLoadState } from '../../components/program-view/ProgramLoadState';
import { useUrlWeekSelection } from '../../components/program-view/weekSelection';
import { Button } from '../../components/ui/button';
import { cardVariants } from '../../components/ui/card';
import { useAppState } from '../../context/AppContext';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import { usePrograms } from '../../context/ProgramContext';
import { useTraining } from '../../context/TrainingContext';
import { currentVersion } from '../../domain/program';

const EMPTY_STATE_FALLBACK = 'Your coach is building it from your answers.';

export function ClientProgram() {
  const { appState, setAppState } = useAppState();
  const { demoJourney } = useClientJourneys();
  const { programFor } = usePrograms();
  const { exercises } = useTraining();
  const selection = useUrlWeekSelection();
  const program = programFor(demoJourney.callId);
  const version = program && currentVersion(program);

  if (appState.programLoad !== 'ready') {
    return (
      <div data-parity-root="ClientProgram">
        <PortalPageHeader title="Program" />
        <ProgramLoadState load={appState.programLoad} onRetry={() => setAppState({ programLoad: 'ready' })} />
      </div>
    );
  }

  if (!program || !version) {
    return (
      <div data-parity-root="ClientProgram">
        <PortalPageHeader title="Program" />
        <div className={cardVariants({ variant: 'panel' })}>
          <EmptyState
            icon={ClipboardList}
            title="Your program is on its way"
            description={SUPPORTING_LINES[demoJourney.stage] ?? EMPTY_STATE_FALLBACK}
          />
        </div>
      </div>
    );
  }

  const view = journeyProgramView({ journey: demoJourney, program, version, exercises, today: new Date() });

  return (
    <div data-parity-root="ClientProgram">
      <PortalPageHeader
        title="Program"
        actionsPlacement="beside-title"
        actions={
          <Button variant="ghost" asChild>
            <Link to="/portal/program/document">
              <Download aria-hidden="true" />
              PDF
              <span className="sr-only">{`: download version ${version.number}`}</span>
            </Link>
          </Button>
        }
      />
      <ClientProgramView view={view} selection={selection} />
    </div>
  );
}
