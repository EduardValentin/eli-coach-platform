import { useCallback } from 'react';
import { useClientJourneys } from '../context/ClientJourneyContext';
import {
  canDeliverProgram,
  deliveryDate,
} from '../domain/coachingSubscription';
import { useJourneyClient } from './useJourneyClient';

export type ProgramDelivery = {
  status: 'no-journey' | 'ready' | 'waiting';
  deliverOn: Date | null;
  deliver: () => void;
};

export function useProgramDelivery(clientId: string): ProgramDelivery {
  const { markProgramReady } = useClientJourneys();
  const journey = useJourneyClient(clientId);
  const callId = journey?.callId ?? null;
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
