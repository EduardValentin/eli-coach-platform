import { DEMO_CLIENT } from '../../context/CheckinContext';
import { DEMO_JOURNEY_CALL_ID } from '../../context/ClientJourneyContext';
import type { ClientJourney, JourneyGender } from '../../domain/journey';
import { clientPronouns } from '../../utils/journeyLabels';
import type { ScheduledClient } from '../CheckinScheduleDialog';

export function awaitingOnboardingReason(gender: JourneyGender): string {
  const { subject, possessive } = clientPronouns(gender);

  return `${subject.capitalised} can answer a check-in once ${subject.lower} ${subject.hasVerb} sent ${possessive.lower} onboarding.`;
}

export function scheduledClientOf(journey: ClientJourney): ScheduledClient {
  const { firstName, lastName } = journey.identity;

  return {
    id: journey.callId === DEMO_JOURNEY_CALL_ID ? DEMO_CLIENT.id : journey.callId,
    name: `${firstName} ${lastName}`.trim(),
    firstName,
  };
}
