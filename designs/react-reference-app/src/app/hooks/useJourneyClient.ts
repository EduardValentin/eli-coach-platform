import { useClientJourneys } from '../context/ClientJourneyContext';
import type { ClientJourney } from '../domain/journey';
import { journeyCallIdForClient } from '../utils/journeyLabels';

export function useJourneyClient(clientId: string): ClientJourney | null {
  const { journeyForCall } = useClientJourneys();
  const alias = journeyCallIdForClient(clientId);

  return journeyForCall(clientId) ?? (alias ? journeyForCall(alias) : null);
}
