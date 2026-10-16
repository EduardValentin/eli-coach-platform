import { CalendarDays, CalendarPlus, Clock } from "lucide-react";
import { useCheckins } from "../../context/CheckinContext";
import {
  canWithdrawRequest,
  proposesNewTime,
  type CheckIn,
} from "../../domain/checkins";
import { useMessaging } from "../../context/MessagingContext";
import {
  formatCheckinDate,
  formatCheckinTime,
} from "../../utils/dateFormatters";
import {
  CheckinCard,
  type CheckinRowActions,
} from "../../components/CheckinCard";
import {
  CheckinListing,
  type CheckinEmptyCopy,
} from "../../components/CheckinListing";
import type { CheckinTab } from "../../utils/checkinListing";
import { JoinMeetLink } from "../../components/JoinMeetLink";
import {
  useCheckinAnswers,
  type CheckinAnswer,
} from "../../hooks/useCheckinAnswers";
import { useCoachCheckinMenu } from "../../hooks/useCoachCheckinMenu";
import { PortalPageHeader } from "../../components/PortalPageHeader";
import { Button } from "../../components/ui/button";
import { firstNameOf } from "../../utils/clientHelpers";
import { toast } from "sonner";

const CLIENT_AVATARS: Record<string, string | null> = {
  c1: "https://i.pravatar.cc/150?img=47",
  c2: "https://i.pravatar.cc/150?img=45",
  c3: null,
  c4: null,
  c5: null,
};

const EMPTY_COPY: Record<CheckinTab, CheckinEmptyCopy> = {
  upcoming: {
    icon: CalendarDays,
    title: "No upcoming check-ins",
    description: "Approved check-ins with your clients show up here.",
  },
  requests: {
    icon: CalendarPlus,
    title: "No open requests",
    description:
      "Requests from your clients and the ones you send show up here.",
  },
  past: {
    icon: Clock,
    title: "No past check-ins yet",
    description: "Passed and cancelled check-ins show up here.",
  },
};

const BUSY_LABEL: Record<CheckinAnswer, string> = {
  approve: "Approving…",
  decline: "Declining…",
  withdraw: "Cancelling…",
};

export function CoachCheckins() {
  const { statusOf } = useCheckins();
  const { addSystemMessage } = useMessaging();
  const { answer, answerInFlight } = useCheckinAnswers();
  const { rescheduleOf, cancelOf, dialogs } = useCoachCheckinMenu();

  const handleApprove = (c: CheckIn) =>
    answer(c, "approve", () => {
      addSystemMessage(
        c.clientId,
        `Check-in confirmed for ${formatCheckinDate(c.date)} at ${formatCheckinTime(c.time)}`,
        "checkin-scheduled",
      );
      toast.success(`Approved check-in with ${c.clientName}`);
    });

  const handleDecline = (c: CheckIn) =>
    answer(c, "decline", () => {
      addSystemMessage(c.clientId, "Check-in cancelled", "checkin-cancelled");
      toast.success("Check-in declined");
    });

  const handleWithdraw = (c: CheckIn) =>
    answer(c, "withdraw", () => {
      addSystemMessage(
        c.clientId,
        "Check-in request cancelled",
        "checkin-cancelled",
      );
      toast.success("Request cancelled");
    });

  const answering = (c: CheckIn) => answerInFlight(c) !== null;

  const busyLabel = (c: CheckIn, action: CheckinAnswer, label: string) =>
    answerInFlight(c) === action ? BUSY_LABEL[action] : label;

  const waitingActions = (c: CheckIn): CheckinRowActions => ({
    shown: canWithdrawRequest(c, "coach") ? (
      <Button
        onClick={() => handleWithdraw(c)}
        disabled={answering(c)}
        aria-busy={answerInFlight(c) === "withdraw" || undefined}
        variant="outline"
        size="xs"
      >
        {busyLabel(c, "withdraw", "Cancel request")}
      </Button>
    ) : undefined,
  });

  const answerActions = (c: CheckIn): CheckinRowActions => ({
    shown: (
      <>
        <Button
          onClick={() => handleDecline(c)}
          disabled={answering(c)}
          aria-busy={answerInFlight(c) === "decline" || undefined}
          variant="ghost"
          size="xs"
        >
          {busyLabel(c, "decline", "Decline")}
        </Button>
        <Button
          onClick={() => handleApprove(c)}
          disabled={answering(c)}
          aria-busy={answerInFlight(c) === "approve" || undefined}
          variant="primary"
          size="xs"
        >
          {busyLabel(c, "approve", proposesNewTime(c) ? "Accept" : "Approve")}
        </Button>
      </>
    ),
    menu: {
      reschedule: rescheduleOf(c),
      disabled: answering(c),
    },
  });

  const clashActions = (c: CheckIn): CheckinRowActions => ({
    menu: { reschedule: rescheduleOf(c), cancel: cancelOf(c) },
  });

  const upcomingActions = (c: CheckIn): CheckinRowActions => ({
    shown: <JoinMeetLink checkin={c} party="coach" size="xs" />,
    menu: {
      reschedule: c.kind === "program-review" ? undefined : rescheduleOf(c),
      cancel: cancelOf(c),
    },
  });

  const card = (c: CheckIn, actions: CheckinRowActions) => (
    <CheckinCard
      checkin={c}
      status={statusOf(c)}
      viewer={{ party: "coach", counterpartName: firstNameOf(c.clientName) }}
      attendee={{
        name: c.clientName,
        imageUrl: CLIENT_AVATARS[c.clientId] ?? undefined,
      }}
      footnote={c.planId ? "Linked to training plan" : undefined}
      actions={actions}
      actionSize="xs"
    />
  );

  const actionsFor = (c: CheckIn, tab: CheckinTab): CheckinRowActions => {
    if (tab === "upcoming") return upcomingActions(c);
    if (tab === "past") return {};
    if (statusOf(c) === "clash") return clashActions(c);
    return c.proposedBy === "coach" ? waitingActions(c) : answerActions(c);
  };

  return (
    <div className="w-full" data-parity-root="CoachCheckins">
      <PortalPageHeader
        title="Check-ins"
        subtitle="Manage all client check-ins in one place."
      />

      <CheckinListing
        party="coach"
        waitingForLabel="Waiting for clients"
        search={{ placeholder: "Search by client name" }}
        emptyCopy={EMPTY_COPY}
        renderCheckin={(c, tab) => card(c, actionsFor(c, tab))}
      />

      {dialogs}
    </div>
  );
}
