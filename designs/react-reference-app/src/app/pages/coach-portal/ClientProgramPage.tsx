import { Link, useParams } from 'react-router';
import { ClientNotFound } from '../../components/coach-portal/ClientNotFound';
import { ProgramSummary } from '../../components/coach-portal/program/ProgramSummary';
import { ProgramDocument } from '../../components/program-view/ProgramDocument';
import { journeyProgramView } from '../../components/program-view/journeyProgramView';
import { PortalBackLink } from '../../components/PortalBackLink';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { SettingsBody, SettingsRows, SettingsSection } from '../../components/SettingsSection';
import { usePrograms } from '../../context/ProgramContext';
import { useTraining } from '../../context/TrainingContext';
import { currentVersion, type ProgramVersion, type VersionState } from '../../domain/program';
import { useJourneyClient } from '../../hooks/useJourneyClient';
import { clientDetailPathForJourney, formatJourneyDate } from '../../utils/journeyLabels';

const VERSION_STATE_LABELS: Record<VersionState, string> = {
  published: 'Published',
  draft: 'Draft',
  superseded: 'Superseded',
};

function versionHeading(version: ProgramVersion): string {
  const date = version.publishedAt ? ` · ${formatJourneyDate(version.publishedAt)}` : '';
  return `Version ${version.number} · ${VERSION_STATE_LABELS[version.state]}${date}`;
}

export function ClientProgramPage() {
  const { id = '' } = useParams();
  const journey = useJourneyClient(id);
  const { programFor } = usePrograms();
  const { exercises } = useTraining();
  const program = journey ? programFor(journey.callId) : undefined;
  if (!journey || !program) return <ClientNotFound />;

  const name = `${journey.identity.firstName} ${journey.identity.lastName}`.trim();
  const current = currentVersion(program);

  return (
    <div className="w-full pb-12" data-parity-root="ClientProgramPage">
      <PortalBackLink to={clientDetailPathForJourney(journey)}>Back to {name}</PortalBackLink>
      <PortalPageHeader title="Program" />
      <div className="mb-8">
        <ProgramSummary journey={journey} program={program} />
      </div>

      {current && (
        <div className="mb-8">
          <ProgramDocument view={journeyProgramView({ journey, program, version: current, exercises, today: new Date() })} />
        </div>
      )}

      <SettingsSection headingId="program-versions" title="Versions">
        <SettingsRows>
          {[...program.versions].reverse().map(version => (
            <SettingsBody key={version.number}>
              <p className="text-sm font-medium text-text-primary">{versionHeading(version)}</p>
              {version.whatChanged && <p className="mt-1 text-sm text-text-secondary">{version.whatChanged}</p>}
              <Link className="mt-1 inline-block text-sm text-primary underline" to={`/coach/clients/${id}/program/document/${version.number}`}>
                Open document
              </Link>
            </SettingsBody>
          ))}
        </SettingsRows>
      </SettingsSection>
    </div>
  );
}
