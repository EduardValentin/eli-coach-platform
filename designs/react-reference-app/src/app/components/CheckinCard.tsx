import type { ReactNode } from 'react';
import { CalendarClock, CalendarX } from 'lucide-react';
import { AppointmentCard } from './coach-portal/AppointmentCard';
import type { AppointmentAttendee } from './coach-portal/appointment';
import { RowActionsMenu, type RowMenuAction } from './RowActionsMenu';
import { Badge } from './ui/badge';
import {
  CHECKIN_KIND_LABEL,
  LATER_WEEK_REASON,
  MOVES_EXHAUSTED_REASON,
  checkinNote,
  checkinStartsAt,
  latestMove,
  previousSlot,
  type CheckIn,
  type CheckinParty,
  type CheckinProposal,
  type CheckinStatus,
} from '../domain/checkins';
import {
  browserTimeZone,
  formatShortDay,
  formatSlotTime,
} from '../utils/dateFormatters';

export type CheckinMenuAction = {
  onSelect: () => void;
  disabledReason?: string;
};

export type CheckinMenu = {
  reschedule?: CheckinMenuAction;
  cancel?: CheckinMenuAction;
  disabled?: boolean;
};

const RESCHEDULE_HELD_BACK_REASON: Record<
  Exclude<CheckinProposal, 'allowed' | 'none'>,
  string
> = {
  exhausted: MOVES_EXHAUSTED_REASON,
  later_week: LATER_WEEK_REASON,
};

export function rescheduleAction(
  proposal: CheckinProposal,
  onSelect: () => void,
): CheckinMenuAction | undefined {
  if (proposal === 'none') return undefined;
  if (proposal === 'allowed') return { onSelect };

  return { onSelect, disabledReason: RESCHEDULE_HELD_BACK_REASON[proposal] };
}

export type CheckinRowActions = {
  shown?: ReactNode;
  menu?: CheckinMenu;
};

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

const CLASH_LABEL: Record<CheckinParty, string> = {
  coach: 'Finding a new time',
  client: 'Your coach is finding a new time',
};

function whenLabelOf(checkin: CheckIn, status: CheckinStatus, viewer: CheckinViewer): string {
  if (status === 'clash') return CLASH_LABEL[viewer.party];

  return [CHECKIN_KIND_LABEL[checkin.kind], moveLabel(checkin, viewer)]
    .filter(Boolean)
    .join(' · ');
}

function statusBadge(status: CheckinStatus): ReactNode {
  if (status === 'cancelled') return <Badge tone="muted">Cancelled</Badge>;
  if (status === 'clash') {
    return (
      <Badge tone="pending" data-parity="clash-badge">
        Clash
      </Badge>
    );
  }

  return undefined;
}

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function moreActionsLabel(startsAt: Date, timeZone: string): string {
  return `More actions for the check-in on ${formatShortDay(startsAt, timeZone)} at ${formatSlotTime(startsAt, timeZone)}`;
}

function menuActions(menu: CheckinMenu): RowMenuAction[] {
  const actions: RowMenuAction[] = [];
  if (menu.reschedule) {
    actions.push({
      name: 'reschedule',
      label: 'Reschedule',
      icon: CalendarClock,
      disabled: menu.disabled,
      ...menu.reschedule,
    });
  }
  if (menu.cancel) {
    actions.push({
      name: 'cancel',
      label: 'Cancel',
      icon: CalendarX,
      tone: 'destructive',
      disabled: menu.disabled,
      ...menu.cancel,
    });
  }

  return actions;
}

function CheckinActions({
  shown,
  more,
  menuLabel,
  size,
}: {
  shown?: ReactNode;
  more: readonly RowMenuAction[];
  menuLabel: string;
  size: 'xs' | 'sm';
}) {
  return (
    <div className="flex w-full items-center gap-2 md:w-auto">
      {shown && (
        <div className="flex flex-1 gap-2 *:flex-1 md:flex-none md:*:flex-none">
          {shown}
        </div>
      )}
      <RowActionsMenu label={menuLabel} actions={more} size={size} />
    </div>
  );
}

export function CheckinCard({
  checkin,
  status,
  viewer,
  attendee,
  footnote,
  actions = {},
  actionSize = 'sm',
}: {
  checkin: CheckIn;
  status: CheckinStatus;
  viewer: CheckinViewer;
  attendee: AppointmentAttendee;
  footnote?: string;
  actions?: CheckinRowActions;
  actionSize?: 'xs' | 'sm';
}) {
  const timeZone = browserTimeZone();
  const startsAt = checkinStartsAt(checkin);
  const previous = previousSlot(checkin);
  const previousWhen = previous ? { startsAt: previous, timeZone } : undefined;
  const awaitingNewTime = status === 'pending' && previousWhen;
  const isOver = status === 'passed' || status === 'cancelled';
  const whenLabel = whenLabelOf(checkin, status, viewer);
  const note = checkinNote(checkin);
  const more = menuActions(actions.menu ?? {});
  const hasActions = Boolean(actions.shown) || more.length > 0;

  return (
    <AppointmentCard
      attendee={attendee}
      when={{ startsAt, timeZone }}
      whenLabel={whenLabel || undefined}
      supersededWhen={awaitingNewTime ? previousWhen : undefined}
      rescheduledFrom={awaitingNewTime ? undefined : previousWhen}
      status={isOver ? 'past' : 'scheduled'}
      badges={statusBadge(status)}
      quote={note?.text}
      quoteAuthor={note ? capitalized(nameFor(note.by, viewer)) : undefined}
      quoteParity="checkin-note"
      footnote={footnote}
      actions={
        hasActions && (
          <CheckinActions
            shown={actions.shown}
            more={more}
            menuLabel={moreActionsLabel(startsAt, timeZone)}
            size={actionSize}
          />
        )
      }
      parity="checkin-card-body"
      parityRoot="CheckinCard"
    />
  );
}
