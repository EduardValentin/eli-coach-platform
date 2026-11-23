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
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { journeyProgramView } from '../../components/program-view/journeyProgramView';
import { ProgramViewer, type UnwrittenBlock } from '../../components/program-view/ProgramViewer';
import { ProgramLoadState } from '../../components/program-view/ProgramLoadState';
import { blocksOf } from '../../components/program-view/programView';
import { useProgramLookup } from '../../components/program-view/useProgramLookup';
import { useUrlWeekSelection } from '../../components/program-view/weekSelection';
import { Button } from '../../components/ui/button';
import { cardVariants } from '../../components/ui/card';
import { useTraining, type Exercise } from '../../context/TrainingContext';
import { currentVersion, draftOf, type ProgramVersion } from '../../domain/program';
import { coachingHasEnded, type ClientJourney } from '../../domain/journey';
import { useJourneyClient } from '../../hooks/useJourneyClient';
import { clientDetailPathForJourney, clientPronouns, journeyClientName } from '../../utils/journeyLabels';

function unwrittenDescription({ name, start }: UnwrittenBlock): string {
  const deadline = start ? ` It must be published before it starts on ${format(start, 'd MMMM')}.` : '';
  return `${name} has no sessions.${deadline}`;
}

function unwrittenAfterCoachingEnded({ name }: UnwrittenBlock): string {
  return `${name} has no sessions.`;
}

function unpublishedDescription(journey: ClientJourney, draft: ProgramVersion | undefined, now: Date): string {
  const promise = coachingHasEnded(journey, now)
    ? `${clientPronouns(journey.profile.identity.gender).possessive.capitalised} coaching has ended.`
    : `${journey.profile.identity.firstName} sees her program once you publish it.`;
  return [draft && `Version ${draft.number} is a draft.`, promise].filter(Boolean).join(' ');
}

export function ClientProgramPage() {
  const { id = '' } = useParams();
  const journey = useJourneyClient(id);
  const lookup = useProgramLookup(journey?.callId ?? null);
  const { exercises } = useTraining();
  const selection = useUrlWeekSelection();
  const client = journey && { name: journeyClientName(journey), path: clientDetailPathForJourney(journey) };

  if (lookup.status === 'pending') {
    return (
      <div className="w-full pb-12" data-parity-root="ClientProgramPage">
        {client ? <ClientPageHeader client={client} title="Program" /> : <PortalPageHeader title="Program" />}
        <ProgramLoadState load={lookup.load} onRetry={lookup.retry} />
      </div>
    );
  }
  if (!journey || !client || lookup.status === 'missing') return <ClientNotFound />;

  const { program } = lookup;
  const draftPath = `${client.path}/program/draft`;
  const documentPath = (version: ProgramVersion) => `/coach/clients/${id}/program/document/${version.number}`;

  const current = currentVersion(program);
  const draft = draftOf(program);
  const view = current && journeyProgramView({ journey, program, version: current, exercises, today: new Date() });
  const nextVersion = <NextVersionAction journey={journey} program={program} />;
  const coachingEnded = coachingHasEnded(journey, new Date());

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
            description={unpublishedDescription(journey, draft, new Date())}
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
          planNotice={view.dayOne && <UpcomingBlockWarnings blocks={blocksOf(view)} dayOne={view.dayOne} today={view.today} />}
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
          unwrittenDescription={coachingEnded ? unwrittenAfterCoachingEnded : unwrittenDescription}
          unwrittenAction={nextVersion}
        />
      )}
    </div>
  );
}
