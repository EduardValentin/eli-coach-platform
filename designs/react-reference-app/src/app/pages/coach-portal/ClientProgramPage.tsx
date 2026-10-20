import { useParams } from 'react-router';
import { ClientNotFound } from '../../components/coach-portal/ClientNotFound';
import { ProgramSummary } from '../../components/coach-portal/program/ProgramSummary';
import { PortalBackLink } from '../../components/PortalBackLink';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { SettingsBody, SettingsRows, SettingsSection } from '../../components/SettingsSection';
import { dayOneOf, usePrograms } from '../../context/ProgramContext';
import { BLOCK_TYPE_LABELS, currentVersion, type ProgramVersion, type VersionState } from '../../domain/program';
import { blockDates } from '../../domain/programCalendar';
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
  const program = journey ? programFor(journey.callId) : undefined;
  if (!journey || !program) return <ClientNotFound />;

  const name = `${journey.identity.firstName} ${journey.identity.lastName}`.trim();
  const current = currentVersion(program);
  const dayOne = dayOneOf(journey);
  const blocks = current?.content.plan.blocks ?? [];

  return (
    <div className="w-full pb-12" data-parity-root="ClientProgramPage">
      <PortalBackLink to={clientDetailPathForJourney(journey)}>Back to {name}</PortalBackLink>
      <PortalPageHeader title="Program" />
      <div className="mb-8">
        <ProgramSummary journey={journey} program={program} />
      </div>

      {current && dayOne && (
        <SettingsSection headingId="program-plan" title="Plan" className="mb-8">
          <SettingsBody>
            <ol className="flex flex-col gap-2 text-sm text-text-primary">
              {blocks.map((block, index) => {
                const { start, end } = blockDates(blocks, index, dayOne);
                return (
                  <li key={block.id}>
                    {index + 1}. {BLOCK_TYPE_LABELS[block.type]} · {block.weeks} weeks · {formatJourneyDate(start)} –{' '}
                    {formatJourneyDate(end)}
                  </li>
                );
              })}
            </ol>
          </SettingsBody>
        </SettingsSection>
      )}

      <SettingsSection headingId="program-versions" title="Versions">
        <SettingsRows>
          {[...program.versions].reverse().map(version => (
            <SettingsBody key={version.number}>
              <p className="text-sm font-medium text-text-primary">{versionHeading(version)}</p>
              {version.whatChanged && <p className="mt-1 text-sm text-text-secondary">{version.whatChanged}</p>}
            </SettingsBody>
          ))}
        </SettingsRows>
      </SettingsSection>
    </div>
  );
}
