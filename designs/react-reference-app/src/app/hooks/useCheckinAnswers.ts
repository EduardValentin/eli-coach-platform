import { useState } from 'react';
import { toast } from 'sonner';
import { useCheckins } from '../context/CheckinContext';
import type { CheckIn } from '../domain/checkins';
import type { CheckinSettlement } from '../services/checkinService';

export type CheckinAnswer = 'approve' | 'decline' | 'withdraw';

type AnswerInFlight = { checkinId: string; answer: CheckinAnswer };

const FAILURE_COPY: Record<CheckinAnswer, string> = {
  approve: "The check-in wasn't approved. Try again.",
  decline: "The check-in wasn't declined. Try again.",
  withdraw: "Your request wasn't cancelled. Try again.",
};

const NO_LONGER_WAITING = 'This request is no longer waiting for an answer.';

export function useCheckinAnswers() {
  const { approveCheckin, declineCheckin, withdrawCheckinRequest } = useCheckins();
  const [inFlight, setInFlight] = useState<AnswerInFlight | null>(null);

  const operations: Record<CheckinAnswer, (checkinId: string) => Promise<CheckinSettlement>> = {
    approve: approveCheckin,
    decline: declineCheckin,
    withdraw: withdrawCheckinRequest,
  };

  const answer = async (checkin: CheckIn, chosen: CheckinAnswer, onSettled: () => void) => {
    setInFlight({ checkinId: checkin.id, answer: chosen });
    try {
      const settlement = await operations[chosen](checkin.id);
      if (settlement === 'settled') onSettled();
      else toast.error(NO_LONGER_WAITING);
    } catch {
      toast.error(FAILURE_COPY[chosen]);
    } finally {
      setInFlight(null);
    }
  };

  const answerInFlight = (checkin: CheckIn): CheckinAnswer | null =>
    inFlight?.checkinId === checkin.id ? inFlight.answer : null;

  return { answer, answerInFlight };
}
