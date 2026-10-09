import { useEffect, useRef, useState } from 'react';
import {
  useCheckins,
  type CheckinRequester,
  type CheckinRequestResult,
} from '../context/CheckinContext';
import type { CheckIn } from '../domain/checkins';
import { browserTimeZone } from '../utils/dateFormatters';
import { CheckinSchedulerSheet, type OpenTimesListing } from './CheckinSchedulerSheet';

type RequestProblem = Exclude<CheckinRequestResult['status'], 'requested'> | 'failed';

const PROBLEM_COPY: Record<RequestProblem, string> = {
  time_taken: 'That time is no longer free. Pick another one.',
  request_waiting: 'You already have a check-in request waiting. You can send another once it is answered.',
  failed: "Your request didn't go through. Try again.",
};

export function CheckinRequestDialog({
  open,
  onOpenChange,
  client,
  onRequested,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: CheckinRequester;
  onRequested: (checkin: CheckIn) => void;
}) {
  const { loadOpenTimes, requestCheckin } = useCheckins();
  const [openTimes, setOpenTimes] = useState<OpenTimesListing>({ status: 'loading' });
  const [loadCount, setLoadCount] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState<RequestProblem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const loadTimes = useRef(loadOpenTimes);
  loadTimes.current = loadOpenTimes;

  useEffect(() => {
    if (!open) return;

    let current = true;
    setOpenTimes((previous) => (previous.status === 'ready' ? previous : { status: 'loading' }));
    loadTimes
      .current()
      .then((times) => {
        if (current) setOpenTimes({ status: 'ready', times });
      })
      .catch(() => {
        if (current) setOpenTimes({ status: 'failed' });
      });

    return () => {
      current = false;
    };
  }, [open, loadCount]);

  const reloadTimes = () => setLoadCount((count) => count + 1);

  const retry = () => {
    setOpenTimes({ status: 'loading' });
    reloadTimes();
  };

  const forget = () => {
    setOpenTimes({ status: 'loading' });
    setSelectedSlot(null);
    setNote('');
    setProblem(null);
  };

  const close = (next: boolean) => {
    if (!next) forget();
    onOpenChange(next);
  };

  const chooseSlot = (slot: Date | null) => {
    setSelectedSlot(slot);
    if (slot) setProblem(null);
  };

  const refuse = (refusal: RequestProblem) => {
    setProblem(refusal);
    if (refusal !== 'time_taken') return;

    setSelectedSlot(null);
    reloadTimes();
  };

  const submit = async () => {
    if (!selectedSlot) return;

    setSubmitting(true);
    setProblem(null);
    try {
      const result = await requestCheckin({ client, startsAt: selectedSlot, note });
      if (result.status !== 'requested') {
        refuse(result.status);
        return;
      }
      forget();
      onOpenChange(false);
      onRequested(result.checkin);
    } catch {
      refuse('failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CheckinSchedulerSheet
      open={open}
      onOpenChange={close}
      variant="request"
      title="Request a check-in"
      description="Pick a date and time that works for you. Your coach will confirm or suggest another time."
      openTimes={openTimes}
      onRetry={retry}
      timeZone={browserTimeZone()}
      selectedSlot={selectedSlot}
      onSelectSlot={chooseSlot}
      note={note}
      onNoteChange={setNote}
      problem={problem ? PROBLEM_COPY[problem] : null}
      submitting={submitting}
      onSubmit={submit}
    />
  );
}
