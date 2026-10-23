import { FolderOpen } from 'lucide-react';
import { Link } from 'react-router';
import { isBeforeStage, type ClientJourney } from '../../domain/journey';
import { getInitials } from '../../utils/clientHelpers';
import { journeyClientName } from '../../utils/journeyLabels';
import { useMeasureUnits } from '../client-portal/measureUnits';
import { AssessmentCallBlock } from './AssessmentCallBlock';
import { ClientProfileBlock } from './ClientProfileBlock';
import { InvitationBlock } from './InvitationBlock';
import { JourneyMeasurements } from './JourneyMeasurements';
import { OnboardingPanel } from './OnboardingPanel';
import { ProgramBlock } from './program/ProgramBlock';
import { ScheduleCheckinAction } from './ScheduleCheckinAction';
import { WeeklyCheckinPanel } from './WeeklyCheckinPanel';
import { PortalBackLink } from '../PortalBackLink';
import { SubscriptionSummary } from '../SubscriptionSummary';
import { needsRefund } from '../../domain/coachingSubscription';
import { NeedsRefundBadge } from './NeedsRefundBadge';
import { PORTAL_PAGE_TITLE_CLASS } from '../typography';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { buttonVariants } from '../ui/button';

function invitationAwaitingAccount(journey: ClientJourney) {
  return isBeforeStage(journey.stage, 'account-created')
    ? journey.invitation
    : null;
}

function SubscriptionAndCheckinWidgets({ journey }: { journey: ClientJourney }) {
  if (!journey.subscription) return null;

  return (
    <>
      <SubscriptionSummary
        subscription={journey.subscription}
        perspective="coach"
        clientGender={journey.profile.identity.gender}
        pricing={journey.pricing}
        headingId="subscription-panel-heading"
        className="mb-8"
      />
      <div
        className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8"
        data-parity="record-widgets-row"
      >
        <WeeklyCheckinPanel journey={journey} />
      </div>
    </>
  );
}

function ClientRecordWidgets({ journey }: { journey: ClientJourney }) {
  const units = useMeasureUnits();
  const invitation = invitationAwaitingAccount(journey);
  const answersApproved = !isBeforeStage(journey.stage, 'approved');
  const onboarding = <OnboardingPanel journey={journey} />;

  return (
    <>
      <ClientProfileBlock journey={journey} />
      {invitation && <InvitationBlock journey={journey} invitation={invitation} />}
      {!answersApproved && onboarding}
      <ProgramBlock journey={journey} />
      <SubscriptionAndCheckinWidgets journey={journey} />
      <JourneyMeasurements
        journey={journey}
        heightCm={journey.profile.coaching?.heightCm ?? 0}
        units={units}
      />
      {answersApproved && onboarding}
      <AssessmentCallBlock journey={journey} />
    </>
  );
}

export function JourneyClientDetails({ journey }: { journey: ClientJourney }) {
  const name = journeyClientName(journey);
  const refundDue = needsRefund(journey.subscription);
  const { avatarUrl } = journey.profile;

  return (
    <div className="w-full pb-12" data-parity-root="JourneyClientDetails">
      <PortalBackLink to="/coach/clients">Back to Clients</PortalBackLink>

      <header className="mb-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-5">
          <Avatar size="lg">
            {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
            <AvatarFallback aria-hidden="true">{getInitials(name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h1 className={PORTAL_PAGE_TITLE_CLASS}>{name}</h1>
              {refundDue && <NeedsRefundBadge parity="needs-refund" />}
            </div>
            <p className="text-text-secondary" data-parity="client-email">{journey.profile.identity.email}</p>
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

      <ClientRecordWidgets journey={journey} />
    </div>
  );
}
