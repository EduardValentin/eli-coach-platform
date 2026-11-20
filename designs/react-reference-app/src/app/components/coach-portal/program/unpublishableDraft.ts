import { coachingHasEnded, type ClientJourney } from '../../../domain/journey';
import { clientPronouns } from '../../../utils/journeyLabels';

export function unpublishableDraftReason(journey: ClientJourney, now: Date): string | null {
  if (!coachingHasEnded(journey, now)) return null;
  const { possessive } = clientPronouns(journey.profile.identity.gender);
  return `${possessive.capitalised} coaching has ended, so this draft can’t be published.`;
}
