import { CalendarDays, CalendarRange, FileText, History, ScrollText } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { ClientNotFound } from '../../components/coach-portal/ClientNotFound';
import { NextVersionAction } from '../../components/coach-portal/program/NextVersionAction';
import { ProgramSummary } from '../../components/coach-portal/program/ProgramSummary';
import { CollapsiblePortalWidget } from '../../components/CollapsiblePortalWidget';
import { BlockSessions } from '../../components/program-view/BlockSessions';
import { journeyProgramView } from '../../components/program-view/journeyProgramView';
import { template, templateCard, TextCardStack, type TextCard } from '../../components/program-view/ProgramText';
import { currentBlock, weekDates, type ProgramView } from '../../components/program-view/programView';
import { WeekDayCards } from '../../components/program-view/WeekDayCards';
import { PortalBackLink } from '../../components/PortalBackLink';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { SettingsBody, SettingsSection } from '../../components/SettingsSection';
import { WIDGET_TITLE_CLASS } from '../../components/typography';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { usePrograms } from '../../context/ProgramContext';
import { useTraining } from '../../context/TrainingContext';
import { BLOCK_TYPE_LABELS, currentVersion, type Block, type Program, type ProgramVersion, type VersionState } from '../../domain/program';
import { SPLIT_TEMPLATES } from '../../domain/splitTemplates';
import { useJourneyClient } from '../../hooks/useJourneyClient';
import { clientDetailPathForJourney, formatJourneyDate } from '../../utils/journeyLabels';

const VERSION_STATE_LABELS: Record<VersionState, string> = {
  published: 'Published',
  draft: 'Draft',
  superseded: 'Superseded',
};

const VERSION_STATE_TONES = {
  published: 'success',
  draft: 'pending',
  superseded: 'muted',
} as const satisfies Record<VersionState, string>;

function documentPath(clientId: string, version: ProgramVersion): string {
  return `/coach/clients/${clientId}/program/document/${version.number}`;
}

function splitLabel(block: Block): string {
  return block.split.name || SPLIT_TEMPLATES[block.split.shape].label;
}

function weekText(block: Block): string {
  const days = Object.values(block.calendar);
  const sessions = days.filter(entry => entry.kind === 'session').length;
  const cardio = days.filter(entry => entry.kind === 'cardio').length;
  const cardioText = cardio > 0 ? ` and ${cardio} cardio ${cardio === 1 ? 'day' : 'days'}` : '';
  return `${splitLabel(block)} · ${sessions} ${sessions === 1 ? 'session' : 'sessions'}${cardioText} a week`;
}

function clientTexts(view: ProgramView, block: Block): TextCard[] {
  const calibration = view.position.status === 'in-plan' && view.position.calibration;
  return [
    templateCard('intro', block.introText || template(view, `block.${block.type}`), `${BLOCK_TYPE_LABELS[block.type]} block`),
    ...(block.clientNote ? [templateCard('note', block.clientNote, 'Client note')] : []),
    ...(calibration ? [templateCard('calibration', template(view, 'calibration'), 'Calibration week')] : []),
    templateCard('split', block.split.text, `Split · ${splitLabel(block)}`),
    ...(view.program.cycleMode === 'adapted' ? [templateCard('cycle', template(view, 'cycle'), 'Listening to your cycle')] : []),
    templateCard('low-energy', template(view, 'lowEnergy'), 'Low-energy session'),
  ];
}

function BlockTextsPanel({ view, block }: { view: ProgramView; block: Block }) {
  return (
    <CollapsiblePortalWidget title="Texts" icon={ScrollText} headingId="program-texts" className="mb-8">
      <TextCardStack cards={clientTexts(view, block)} />
    </CollapsiblePortalWidget>
  );
}

function VersionsPanel({ clientId, program }: { clientId: string; program: Program }) {
  return (
    <SettingsSection headingId="program-versions" title="Versions" icon={History}>
      <ol className="divide-y divide-border-subtle">
        {[...program.versions].reverse().map(version => (
          <li key={version.number} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
            <div className="grid min-w-0 gap-1">
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-text-primary">{`Version ${version.number}`}</span>
                <Badge tone={VERSION_STATE_TONES[version.state]}>{VERSION_STATE_LABELS[version.state]}</Badge>
                {version.publishedAt && <span className="text-sm text-text-secondary tabular-nums">{formatJourneyDate(version.publishedAt)}</span>}
              </p>
              {version.whatChanged && <p className="max-w-prose text-sm text-text-secondary">{version.whatChanged}</p>}
            </div>
            <Button variant="outline" size="sm" className="self-start" asChild>
              <Link to={documentPath(clientId, version)}>
                <FileText aria-hidden="true" />
                Open document
              </Link>
            </Button>
          </li>
        ))}
      </ol>
    </SettingsSection>
  );
}

function ReadView({ view, block }: { view: ProgramView; block: Block }) {
  return (
    <>
      <SettingsSection headingId="program-this-week" title="This week" icon={CalendarDays} description={weekText(block)} className="mb-8">
        <SettingsBody>
          <WeekDayCards block={block} dates={weekDates(view)} today={view.today} />
        </SettingsBody>
      </SettingsSection>
      <section aria-labelledby="program-sessions" className="mb-8 grid gap-4">
        <div className="grid gap-1">
          <h2 id="program-sessions" className={WIDGET_TITLE_CLASS}>
            {`${BLOCK_TYPE_LABELS[block.type]} block sessions`}
          </h2>
          <p className="text-sm text-text-secondary">In the order of the week</p>
        </div>
        <BlockSessions block={block} exercisesById={view.exercisesById} />
      </section>
      <BlockTextsPanel view={view} block={block} />
    </>
  );
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
  const view = current && journeyProgramView({ journey, program, version: current, exercises, today: new Date() });
  const block = view && currentBlock(view);

  return (
    <div className="w-full pb-12" data-parity-root="ClientProgramPage">
      <PortalBackLink to={clientDetailPathForJourney(journey)}>Back to {name}</PortalBackLink>
      <PortalPageHeader
        eyebrow={name}
        title="Program"
        actions={
          <>
            {current && (
              <Button variant="outline" asChild>
                <Link to={documentPath(id, current)}>
                  <FileText aria-hidden="true" />
                  Open document
                </Link>
              </Button>
            )}
            <NextVersionAction journey={journey} program={program} />
          </>
        }
      />
      {current && (
        <SettingsSection headingId="program-plan" title="Plan" icon={CalendarRange} className="mb-8">
          <SettingsBody>
            <ProgramSummary journey={journey} program={program} />
          </SettingsBody>
        </SettingsSection>
      )}
      {view && block && <ReadView view={view} block={block} />}
      <VersionsPanel clientId={id} program={program} />
    </div>
  );
}
