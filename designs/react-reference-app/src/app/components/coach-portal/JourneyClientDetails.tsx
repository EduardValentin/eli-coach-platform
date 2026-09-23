import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import type { ClientJourney } from '../../domain/journey';
import { getInitials } from '../../utils/clientHelpers';
import { MeasurementsTable } from './MeasurementsTable';
import { OnboardingPanel } from './OnboardingPanel';
import { SubscriptionSummary } from '../SubscriptionSummary';

function journeyName(journey: ClientJourney): string {
  return `${journey.identity.firstName} ${journey.identity.lastName}`.trim();
}

function statedHeightCm(journey: ClientJourney): number {
  const stated = journey.onboarding.answers['goal-availability'].height;

  return typeof stated === 'number' ? stated : 0;
}

export function JourneyClientDetails({ journey }: { journey: ClientJourney }) {
  const name = journeyName(journey);

  return (
    <div className="w-full pb-12">
      <Link
        to="/coach/clients"
        className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft size={16} /> Back to Clients
      </Link>

      <header className="mb-10 flex items-center gap-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-neutral-100 font-serif text-xl font-semibold text-text-primary">
          {getInitials(name)}
        </div>
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-3xl tracking-tight text-text-primary lg:text-4xl">
              {name}
            </h1>
          </div>
          <p className="font-medium text-text-secondary">
            {journey.identity.email}
          </p>
        </div>
      </header>

      <OnboardingPanel
        journey={journey}
        clientId={journey.callId}
        heightCm={statedHeightCm(journey)}
      />
      {journey.subscription && (
        <SubscriptionSummary
          subscription={journey.subscription}
          perspective="coach"
          headingId="subscription-panel-heading"
          className="mb-8"
        />
      )}
      <MeasurementsTable
        measurements={journey.measurements}
        heightCm={statedHeightCm(journey)}
      />
    </div>
  );
}
