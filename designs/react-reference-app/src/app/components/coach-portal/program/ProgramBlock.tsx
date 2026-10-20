import { ClipboardList } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { usePrograms } from '../../../context/ProgramContext';
import { isBeforeStage, type ClientJourney } from '../../../domain/journey';
import { draftOf } from '../../../domain/program';
import { clientDetailPathForJourney, formatJourneyDate } from '../../../utils/journeyLabels';
import { SettingsBody, SettingsSection } from '../../SettingsSection';
import { Button } from '../../ui/button';
import { coachingHasEnded, ProgramSummary } from './ProgramSummary';

export function ProgramBlock({ journey }: { journey: ClientJourney }) {
  const { programFor, startDraft } = usePrograms();
  const navigate = useNavigate();
  const program = programFor(journey.callId);
  const programPath = `${clientDetailPathForJourney(journey)}/program`;
  const draft = program && draftOf(program);
  const published = program?.versions.some(version => version.state === 'published');
  const canStartVersion = !coachingHasEnded(journey, new Date());

  function startNewVersion() {
    startDraft(journey.callId);
    navigate(`${programPath}/draft`);
  }

  function body() {
    if (!program) {
      return isBeforeStage(journey.stage, 'submitted') ? (
        <p className="text-sm text-text-secondary">Available once her onboarding is sent</p>
      ) : (
        <Button variant="primary" asChild>
          <Link to={`${programPath}/new`}>Build program</Link>
        </Button>
      );
    }
    if (!published) {
      return (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-text-primary">
            Draft version {draft?.number ?? 1}, started {formatJourneyDate(new Date())}
          </p>
          <Button variant="primary" asChild>
            <Link to={`${programPath}/draft`}>Continue draft</Link>
          </Button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-start gap-4">
        <ProgramSummary journey={journey} program={program} />
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link to={programPath}>View program</Link>
          </Button>
          {draft && (
            <Button variant="primary" asChild>
              <Link to={`${programPath}/draft`}>Continue draft</Link>
            </Button>
          )}
          {!draft && canStartVersion && (
            <Button variant="primary" onClick={startNewVersion}>
              New version
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <SettingsSection
      headingId="client-program"
      title="Program"
      icon={ClipboardList}
      parityRoot="ProgramBlock"
      className="mb-8"
    >
      <SettingsBody>{body()}</SettingsBody>
    </SettingsSection>
  );
}
