import type { ReactNode } from 'react';
import { AppointmentCard } from './coach-portal/AppointmentCard';
import type { AppointmentAttendee } from './coach-portal/appointment';
import { Badge } from './ui/badge';
import {
  CHECKIN_KIND_LABEL,
  checkinNote,
  checkinStartsAt,
  latestMove,
  previousSlot,
  type CheckIn,
  type CheckinParty,
  type CheckinStatus,
} from '../domain/checkins';
import { browserTimeZone } from '../utils/dateFormatters';

export type CheckinViewer = {
  party: CheckinParty;
  counterpartName: string;
};

function nameFor(party: CheckinParty, viewer: CheckinViewer): string {
  return party === viewer.party ? 'you' : viewer.counterpartName;
}

function moveLabel(checkin: CheckIn, viewer: CheckinViewer): string | null {
  const move = latestMove(checkin);
  if (!move) return null;

  const who = nameFor(move.by, viewer);
  return move.move === 'new-time' ? `New time from ${who}` : `Requested by ${who}`;
}

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function CheckinCard({
  checkin,
  status,
  viewer,
  attendee,
  footnote,
  actions,
}: {
  checkin: CheckIn;
  status: CheckinStatus;
  viewer: CheckinViewer;
  attendee: AppointmentAttendee;
  footnote?: string;
  actions?: ReactNode;
}) {
  const timeZone = browserTimeZone();
  const previous = previousSlot(checkin);
  const previousWhen = previous ? { startsAt: previous, timeZone } : undefined;
  const awaitingNewTime = status === 'pending' && previousWhen;
  const isOver = status === 'passed' || status === 'cancelled';
  const whenLabel = [CHECKIN_KIND_LABEL[checkin.kind], moveLabel(checkin, viewer)]
    .filter(Boolean)
    .join(' · ');
  const note = checkinNote(checkin);

  return (
    <AppointmentCard
      attendee={attendee}
      when={{ startsAt: checkinStartsAt(checkin), timeZone }}
      whenLabel={whenLabel || undefined}
      supersededWhen={awaitingNewTime ? previousWhen : undefined}
      rescheduledFrom={awaitingNewTime ? undefined : previousWhen}
      status={isOver ? 'past' : 'scheduled'}
      badges={
        status === 'cancelled' ? <Badge tone="muted">Cancelled</Badge> : undefined
      }
      quote={note?.text}
      quoteAuthor={note ? capitalized(nameFor(note.by, viewer)) : undefined}
      quoteParity="checkin-note"
      footnote={footnote}
      actions={actions}
      parityRoot="CheckinCard"
    />
  );
}
