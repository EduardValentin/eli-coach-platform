import { useEffect } from 'react';
import { VideoOff } from 'lucide-react';
import { useParams } from 'react-router';
import {
  ErrorPage,
  DeadEndLink,
  FULL_PAGE_MESSAGE_SHELL_CLASS,
} from '../components/ErrorPage';
import { useAssessmentCalls } from '../context/AssessmentCallContext';
import { DEMO_CLIENT, useCheckins } from '../context/CheckinContext';
import type { CheckIn, CheckinParty } from '../domain/checkins';
import { NotFound } from './NotFound';

type NotReadyCopy = {
  title: string;
  description: string;
  actionPath: string;
  actionLabel: string;
  actionDirection: 'back' | 'forward';
};

const NOT_READY_COPY: Record<CheckinParty, NotReadyCopy> = {
  client: {
    title: "Your check-in link isn't ready yet",
    description:
      "The meeting room for this check-in hasn't been set up yet. Check back closer to the time.",
    actionPath: '/portal/checkins',
    actionLabel: 'Back to check-ins',
    actionDirection: 'back',
  },
  coach: {
    title: "Your meeting link isn't set yet",
    description:
      "You haven't saved a meeting link yet. Add it in Settings so you and your client can join.",
    actionPath: '/coach/settings',
    actionLabel: 'Go to Settings',
    actionDirection: 'forward',
  },
};

function visibleTo(checkin: CheckIn, party: CheckinParty): boolean {
  return party === 'coach' || checkin.clientId === DEMO_CLIENT.id;
}

export function CheckinJoin({ party }: { party: CheckinParty }) {
  const { checkinId } = useParams();
  const { findCheckin, statusOf } = useCheckins();
  const { settings } = useAssessmentCalls();
  const checkin = checkinId ? findCheckin(checkinId) : undefined;
  const joinable =
    checkin !== undefined && visibleTo(checkin, party) && statusOf(checkin) === 'approved';
  const meetingLink = settings.meetingLink;

  useEffect(() => {
    if (joinable && meetingLink) window.location.assign(meetingLink);
  }, [joinable, meetingLink]);

  if (!joinable) return <NotFound />;

  if (meetingLink) {
    return (
      <main aria-label="Your check-in" className={FULL_PAGE_MESSAGE_SHELL_CLASS}>
        <p role="status" className="text-text-secondary">
          Taking you to your check-in…
        </p>
      </main>
    );
  }

  const copy = NOT_READY_COPY[party];

  return (
    <ErrorPage
      icon={VideoOff}
      title={copy.title}
      description={copy.description}
      landmarkLabel="Your check-in"
      parityRoot="CheckinJoinNotReady"
    >
      <DeadEndLink direction={copy.actionDirection} to={copy.actionPath}>
        {copy.actionLabel}
      </DeadEndLink>
    </ErrorPage>
  );
}
