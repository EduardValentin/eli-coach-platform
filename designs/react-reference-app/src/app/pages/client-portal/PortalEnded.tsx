import { CalendarX } from 'lucide-react';
import { ErrorPage } from '../../components/ErrorPage';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import { needsRefund } from '../../domain/coachingSubscription';
import {
  COACHING_ENDED_LINE,
  COACHING_ENDED_TITLE,
  REFUND_ON_ITS_WAY_LINE,
} from '../../utils/subscriptionCopy';

export function PortalEnded() {
  const { demoJourney } = useClientJourneys();
  const { subscription } = demoJourney;
  const refundDue = subscription ? needsRefund(subscription) : false;

  return (
    <ErrorPage
      description={COACHING_ENDED_LINE}
      detail={refundDue ? REFUND_ON_ITS_WAY_LINE : undefined}
      icon={CalendarX}
      landmarkLabel={COACHING_ENDED_TITLE}
      parityRoot="PortalEnded"
      title={COACHING_ENDED_TITLE}
    />
  );
}
