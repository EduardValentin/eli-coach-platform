import { useCallback } from 'react';
import { useClientJourneys } from '../context/ClientJourneyContext';
import {
  canStartWork,
  workStartDate,
} from '../domain/coachingSubscription';
import { useJourneyClient } from './useJourneyClient';

export type ProgramDelivery = {
  status: 'no-journey' | 'ready' | 'waiting';
  workStartsOn: Date | null;
  deliver: () => void;
};

export function useProgramDelivery(clientId: string): ProgramDelivery {
  const { markProgramReady } = useClientJourneys();
  const journey = useJourneyClient(clientId);
  const callId = journey?.callId ?? null;
  const subscription = journey?.subscription;
  const ready = subscription ? canStartWork(subscription, new Date()) : false;

  const deliver = useCallback(() => {
    if (!callId || !subscription) return;
    if (!canStartWork(subscription, new Date())) return;

    markProgramReady(callId, new Date());
  }, [callId, subscription, markProgramReady]);

  if (!journey || !subscription) {
    return { status: 'no-journey', workStartsOn: null, deliver };
  }

  return {
    status: ready ? 'ready' : 'waiting',
    workStartsOn: workStartDate(subscription),
    deliver,
  };
}
