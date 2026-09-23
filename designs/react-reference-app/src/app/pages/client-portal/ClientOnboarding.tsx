import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { SectionEyebrow } from '../../components/SectionEyebrow';
import { AnswerRequestCard } from '../../components/client-portal/onboarding/AnswerRequestCard';
import { OnboardingWizard } from '../../components/client-portal/onboarding/OnboardingWizard';
import { ANSWER_REQUEST_PARAM } from '../../components/client-portal/ClientJourneyGate';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import type { ClientJourney, DetailRequest } from '../../domain/journey';

const WIZARD_TITLE = "Let's get you set up";
const ANSWER_TITLE = 'A few more details';

function pendingRequest(journey: ClientJourney): DetailRequest | null {
  const latest = journey.review.requests.at(-1);

  return latest && !latest.answeredAt ? latest : null;
}

function OnboardingShell({
  label,
  header,
  children,
}: {
  label: string;
  header?: { eyebrow: string; title: string };
  children: ReactNode;
}) {
  return (
    <main
      aria-label={label}
      className="min-h-screen bg-surface-page px-4 py-10 sm:px-6 lg:py-16"
    >
      <div className="mx-auto w-full max-w-2xl">
        {header && (
          <div className="mb-8 text-center">
            <SectionEyebrow className="mb-2">{header.eyebrow}</SectionEyebrow>
            <h1 className="font-serif text-3xl tracking-tight text-text-primary lg:text-display-md">
              {header.title}
            </h1>
          </div>
        )}
        {children}
      </div>
    </main>
  );
}

export function ClientOnboarding() {
  const [searchParams] = useSearchParams();
  const { demoJourney } = useClientJourneys();
  const request = pendingRequest(demoJourney);

  if (searchParams.get(ANSWER_REQUEST_PARAM) === '1' && request) {
    return (
      <OnboardingShell label={ANSWER_TITLE}>
        <AnswerRequestCard request={request} />
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      label={WIZARD_TITLE}
      header={{ eyebrow: 'Welcome to Evoa', title: WIZARD_TITLE }}
    >
      <OnboardingWizard />
    </OnboardingShell>
  );
}
