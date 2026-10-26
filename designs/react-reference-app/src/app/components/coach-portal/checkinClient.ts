import type { ClientJourney, JourneyGender } from '../../domain/journey';
import { clientIdForJourney, clientPronouns, journeyClientName } from '../../utils/journeyLabels';
import type { ScheduledClient } from '../CheckinScheduleDialog';

export function awaitingOnboardingReason(gender: JourneyGender): string {
  const { subject, possessive } = clientPronouns(gender);

  return `${subject.capitalised} can answer a check-in once ${subject.lower} ${subject.hasVerb} sent ${possessive.lower} onboarding.`;
}

export function scheduledClientOf(journey: ClientJourney): ScheduledClient {
  return {
    id: clientIdForJourney(journey),
    name: journeyClientName(journey),
    firstName: journey.profile.identity.firstName,
  };
}
