import { coachingHasEnded, type ClientJourney } from '../../../domain/journey';
import { clientPronouns } from '../../../utils/journeyLabels';

export type DraftState = 'publishable' | 'coaching-ended';

export function draftStateOf(journey: ClientJourney, now: Date): DraftState {
  return coachingHasEnded(journey, now) ? 'coaching-ended' : 'publishable';
}

export function coachingEndedDraftReason(journey: ClientJourney): string {
  const { possessive } = clientPronouns(journey.profile.identity.gender);
  return `${possessive.capitalised} coaching has ended, so this draft can’t be published.`;
}
