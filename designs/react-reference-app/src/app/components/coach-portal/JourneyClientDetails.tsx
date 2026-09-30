import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { isBeforeStage, type ClientJourney } from '../../domain/journey';
import { getInitials } from '../../utils/clientHelpers';
import { MeasurementsTable } from '../MeasurementsTable';
import { useMeasureUnits } from '../client-portal/measureUnits';
import { statedHeightCm } from '../../domain/bodyMetrics';
import { AssessmentCallBlock } from './AssessmentCallBlock';
import { ClientProfileBlock } from './ClientProfileBlock';
import { InvitationBlock } from './InvitationBlock';
import { OnboardingPanel } from './OnboardingPanel';
import { SubscriptionSummary } from '../SubscriptionSummary';
import { PORTAL_PAGE_TITLE_CLASS } from '../typography';
import { noMeasurementsYetLine } from '../../utils/journeyLabels';
import { Avatar, AvatarFallback } from '../ui/avatar';

function journeyName(journey: ClientJourney): string {
  return `${journey.identity.firstName} ${journey.identity.lastName}`.trim();
}

function invitationAwaitingAccount(journey: ClientJourney) {
  return isBeforeStage(journey.stage, 'account-created')
    ? journey.invitation
    : null;
}

export function JourneyClientDetails({ journey }: { journey: ClientJourney }) {
  const name = journeyName(journey);
  const units = useMeasureUnits();
  const invitation = invitationAwaitingAccount(journey);

  return (
    <div className="w-full pb-12" data-parity-root="JourneyClientDetails">
      <Link
        to="/coach/clients"
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft size={16} /> Back to Clients
      </Link>

      <header className="mb-10 flex items-center gap-5">
        <Avatar size="lg">
          <AvatarFallback aria-hidden="true">{getInitials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <h1 className={PORTAL_PAGE_TITLE_CLASS}>{name}</h1>
          </div>
          <p className="text-text-secondary">{journey.identity.email}</p>
        </div>
      </header>

      <ClientProfileBlock journey={journey} />
      <AssessmentCallBlock journey={journey} />
      {invitation && (
        <InvitationBlock journey={journey} invitation={invitation} />
      )}
      <OnboardingPanel
        journey={journey}
        clientId={journey.callId}
        heightCm={statedHeightCm(journey.onboarding.answers)}
      />
      {journey.subscription && (
        <SubscriptionSummary
          subscription={journey.subscription}
          perspective="coach"
          clientGender={journey.identity.gender}
          headingId="subscription-panel-heading"
          className="mb-8"
        />
      )}
      <MeasurementsTable
        measurements={journey.measurements}
        heightCm={statedHeightCm(journey.onboarding.answers)}
        units={units}
        headingId="measurements-panel-heading"
        emptyMessage={noMeasurementsYetLine(journey.identity.gender)}
        className="mb-8"
      />
    </div>
  );
}
