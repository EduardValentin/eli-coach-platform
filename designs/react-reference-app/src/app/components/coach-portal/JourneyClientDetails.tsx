import { FolderOpen } from 'lucide-react';
import { Link } from 'react-router';
import { isBeforeStage, type ClientJourney } from '../../domain/journey';
import { getInitials } from '../../utils/clientHelpers';
import { useMeasureUnits } from '../client-portal/measureUnits';
import { statedHeightCm } from '../../domain/bodyMetrics';
import { AssessmentCallBlock } from './AssessmentCallBlock';
import { ClientProfileBlock } from './ClientProfileBlock';
import { InvitationBlock } from './InvitationBlock';
import { JourneyMeasurements } from './JourneyMeasurements';
import { OnboardingPanel } from './OnboardingPanel';
import { ScheduleCheckinAction } from './ScheduleCheckinAction';
import { PortalBackLink } from '../PortalBackLink';
import { SubscriptionSummary } from '../SubscriptionSummary';
import { needsRefund } from '../../domain/coachingSubscription';
import { NeedsRefundBadge } from './NeedsRefundBadge';
import { PORTAL_PAGE_TITLE_CLASS } from '../typography';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { buttonVariants } from '../ui/button';

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
  const refundDue = needsRefund(journey.subscription);

  return (
    <div className="w-full pb-12" data-parity-root="JourneyClientDetails">
      <PortalBackLink to="/coach/clients">Back to Clients</PortalBackLink>

      <header className="mb-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-5">
          <Avatar size="lg">
            <AvatarFallback aria-hidden="true">{getInitials(name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h1 className={PORTAL_PAGE_TITLE_CLASS}>{name}</h1>
              {refundDue && <NeedsRefundBadge parity="needs-refund" />}
            </div>
            <p className="text-text-secondary" data-parity="client-email">{journey.identity.email}</p>
          </div>
        </div>
        <div
          className="flex flex-wrap items-center gap-3 md:shrink-0"
          data-parity="client-header-actions"
        >
          <Link
            to={`/coach/clients/${journey.callId}/resources`}
            className={buttonVariants({ variant: 'outline', size: 'md' })}
          >
            <FolderOpen aria-hidden="true" size={16} />
            Resources
          </Link>
          <ScheduleCheckinAction journey={journey} />
        </div>
      </header>

      <ClientProfileBlock journey={journey} />
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
          pricing={journey.pricing}
          headingId="subscription-panel-heading"
          className="mb-8"
        />
      )}
      <JourneyMeasurements
        journey={journey}
        heightCm={statedHeightCm(journey.onboarding.answers)}
        units={units}
      />
      <AssessmentCallBlock journey={journey} />
    </div>
  );
}
