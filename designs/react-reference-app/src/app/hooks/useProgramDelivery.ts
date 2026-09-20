import { useCallback } from 'react';
import { useClientJourneys } from '../context/ClientJourneyContext';
import {
  canDeliverProgram,
  deliveryDate,
} from '../domain/coachingSubscription';
import { journeyCallIdForClient } from '../utils/journeyLabels';

export type ProgramDelivery = {
  status: 'no-journey' | 'ready' | 'waiting';
  deliverOn: Date | null;
  deliver: () => void;
};

export function useProgramDelivery(clientId: string): ProgramDelivery {
  const { journeyForCall, markProgramReady } = useClientJourneys();
  const callId = journeyCallIdForClient(clientId);
  const journey = callId ? journeyForCall(callId) : null;
  const subscription = journey?.subscription;
  const ready = subscription ? canDeliverProgram(subscription, new Date()) : false;

  const deliver = useCallback(() => {
    if (!callId || !subscription) return;
    if (!canDeliverProgram(subscription, new Date())) return;

    markProgramReady(callId, new Date());
  }, [callId, subscription, markProgramReady]);

  if (!journey || !subscription) {
    return { status: 'no-journey', deliverOn: null, deliver };
  }

  return {
    status: ready ? 'ready' : 'waiting',
    deliverOn: deliveryDate(subscription),
    deliver,
  };
}
