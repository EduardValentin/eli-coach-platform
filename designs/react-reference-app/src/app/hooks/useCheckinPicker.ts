import { useEffect, useRef, useState } from 'react';
import { useCheckins } from '../context/CheckinContext';
import type { OpenTimesListing } from '../components/CheckinSchedulerSheet';

export type CheckinChoice = { startsAt: Date; note: string };

const TIME_TAKEN = 'time_taken';

export function useCheckinPicker<Refusal extends string>({
  open,
  onOpenChange,
  send,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  send: (choice: CheckinChoice) => Promise<Refusal | null>;
}) {
  const { loadOpenTimes } = useCheckins();
  const [openTimes, setOpenTimes] = useState<OpenTimesListing>({ status: 'loading' });
  const [loadCount, setLoadCount] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState<Refusal | 'failed' | null>(null);
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

  const refuse = (refusal: Refusal | 'failed') => {
    setProblem(refusal);
    if (refusal !== TIME_TAKEN) return;

    setSelectedSlot(null);
    reloadTimes();
  };

  const submit = async () => {
    if (!selectedSlot) return;

    setSubmitting(true);
    setProblem(null);
    try {
      const refusal = await send({ startsAt: selectedSlot, note });
      if (refusal) {
        refuse(refusal);
        return;
      }
      forget();
      onOpenChange(false);
    } catch {
      refuse('failed');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    problem,
    sheet: {
      open,
      onOpenChange: close,
      openTimes,
      onRetry: retry,
      selectedSlot,
      onSelectSlot: chooseSlot,
      note,
      onNoteChange: setNote,
      submitting,
      onSubmit: submit,
    },
  };
}
