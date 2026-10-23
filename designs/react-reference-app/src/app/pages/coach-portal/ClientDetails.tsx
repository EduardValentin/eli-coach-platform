import { useParams } from 'react-router';
import { ClientNotFound } from '../../components/coach-portal/ClientNotFound';
import { JourneyClientDetails } from '../../components/coach-portal/JourneyClientDetails';
import { useJourneyClient } from '../../hooks/useJourneyClient';

export function ClientDetails() {
  const { id = '' } = useParams();
  const journey = useJourneyClient(id);

  return journey ? <JourneyClientDetails journey={journey} /> : <ClientNotFound />;
}
