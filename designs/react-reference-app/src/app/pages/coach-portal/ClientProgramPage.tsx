import { format } from 'date-fns';
import { FileText, Pencil } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { ClientNotFound } from '../../components/coach-portal/ClientNotFound';
import { ClientPageHeader } from '../../components/coach-portal/ClientPageHeader';
import { ExerciseLibraryLink } from '../../components/coach-portal/ExerciseLibraryLink';
import { NextVersionAction } from '../../components/coach-portal/program/NextVersionAction';
import { UpcomingBlockWarnings } from '../../components/coach-portal/program/UpcomingBlockWarnings';
import { publishedText } from '../../components/coach-portal/program/VersionReading';
import { EmptyState } from '../../components/EmptyState';
import { journeyProgramView } from '../../components/program-view/journeyProgramView';
import { ProgramViewer, type UnwrittenBlock } from '../../components/program-view/ProgramViewer';
import { ProgramLoadState } from '../../components/program-view/ProgramLoadState';
import { useUrlWeekSelection } from '../../components/program-view/weekSelection';
import { Button } from '../../components/ui/button';
import { cardVariants } from '../../components/ui/card';
import { useAppState } from '../../context/AppContext';
import { usePrograms } from '../../context/ProgramContext';
import { useTraining, type Exercise } from '../../context/TrainingContext';
import { currentVersion, draftOf, type ProgramVersion } from '../../domain/program';
import { useJourneyClient } from '../../hooks/useJourneyClient';
import { clientDetailPathForJourney, journeyClientName } from '../../utils/journeyLabels';

function unwrittenDescription({ name, start }: UnwrittenBlock): string {
  const deadline = start ? ` It must be published before it starts on ${format(start, 'd MMMM')}.` : '';
  return `${name} has no sessions.${deadline}`;
}

export function ClientProgramPage() {
  const { id = '' } = useParams();
  const { appState, setAppState } = useAppState();
  const journey = useJourneyClient(id);
  const { programFor } = usePrograms();
  const { exercises } = useTraining();
  const selection = useUrlWeekSelection();
  const program = journey ? programFor(journey.callId) : undefined;
  if (!journey || !program) return <ClientNotFound />;

  const client = { name: journeyClientName(journey), path: clientDetailPathForJourney(journey) };
  const draftPath = `${client.path}/program/draft`;
  const documentPath = (version: ProgramVersion) => `/coach/clients/${id}/program/document/${version.number}`;

  if (appState.programLoad !== 'ready') {
    return (
      <div className="w-full pb-12" data-parity-root="ClientProgramPage">
        <ClientPageHeader client={client} title="Program" />
        <ProgramLoadState load={appState.programLoad} onRetry={() => setAppState({ programLoad: 'ready' })} />
      </div>
    );
  }

  const current = currentVersion(program);
  const draft = draftOf(program);
  const view = current && journeyProgramView({ journey, program, version: current, exercises, today: new Date() });
  const nextVersion = <NextVersionAction journey={journey} program={program} />;

  return (
    <div className="w-full pb-12" data-parity-root="ClientProgramPage">
      <ClientPageHeader
        client={client}
        title="Program"
        subtitle={current && [`Version ${current.number}`, publishedText(current)].filter(Boolean).join(' · ')}
        actions={
          <>
            {current && (
              <Button variant="outline" size="md" asChild>
                <Link to={documentPath(current)}>
                  <FileText aria-hidden="true" />
                  Open document
                </Link>
              </Button>
            )}
            {current && <NextVersionAction journey={journey} program={program} size="md" />}
          </>
        }
      />
      {!view && (
        <div className={cardVariants({ variant: 'panel' })}>
          <EmptyState
            icon={Pencil}
            title="No published version yet"
            description={[draft && `Version ${draft.number} is a draft.`, `${journey.profile.identity.firstName} sees her program once you publish it.`].filter(Boolean).join(' ')}
            action={nextVersion}
          />
        </div>
      )}
      {view && (
        <ProgramViewer
          view={view}
          selection={selection}
          planPlacement="before-week"
          planVoice="coach"
          planNotice={view.dayOne && <UpcomingBlockWarnings blocks={view.version.content.plan.blocks} dayOne={view.dayOne} today={view.today} />}
          versions={program.versions}
          versionStates="shown"
          versionAction={version =>
            version.state === 'draft' ? (
              <Button variant="outline" size="sm" asChild>
                <Link to={draftPath}>
                  <Pencil aria-hidden="true" />
                  Continue draft
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link to={documentPath(version)}>
                  <FileText aria-hidden="true" />
                  Open document
                  <span className="sr-only">{`, version ${version.number}`}</span>
                </Link>
              </Button>
            )
          }
          exerciseDetailFooter={exercise => <ExerciseLibraryLink exercise={exercise} />}
          unwrittenDescription={unwrittenDescription}
          unwrittenAction={nextVersion}
        />
      )}
    </div>
  );
}
