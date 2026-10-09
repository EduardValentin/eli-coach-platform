import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Video } from 'lucide-react';
import { isJoinable, type CheckIn, type CheckinParty } from '../domain/checkins';
import { buttonVariants } from './ui/button';

const MINUTE_MS = 60 * 1000;

const PORTAL_CHECKINS_PATH: Record<CheckinParty, string> = {
  client: '/portal/checkins',
  coach: '/coach/checkins',
};

function joinPathOf(checkin: CheckIn, party: CheckinParty): string {
  return `${PORTAL_CHECKINS_PATH[party]}/${encodeURIComponent(checkin.id)}/join`;
}

function useMinuteTick(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), MINUTE_MS);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}

export function JoinMeetLink({
  checkin,
  party,
  size = 'sm',
  className,
}: {
  checkin: CheckIn;
  party: CheckinParty;
  size?: 'xs' | 'sm';
  className?: string;
}) {
  const now = useMinuteTick();
  const live = isJoinable(checkin, now);

  return (
    <Link
      to={joinPathOf(checkin, party)}
      data-parity="join-meet"
      className={buttonVariants({
        variant: live ? 'primary' : 'outline',
        size,
        className,
      })}
    >
      <Video size={14} aria-hidden="true" />
      Join Meet
    </Link>
  );
}
