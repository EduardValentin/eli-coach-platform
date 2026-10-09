import { Video } from 'lucide-react';
import { isJoinable, type CheckIn } from '../domain/checkins';
import { buttonVariants } from './ui/button';

const MEET_URL = 'https://meet.google.com/mock-eli-checkin';

export function JoinMeetLink({
  checkin,
  className,
}: {
  checkin: CheckIn;
  className?: string;
}) {
  const live = isJoinable(checkin, new Date());

  return (
    <a
      href={MEET_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonVariants({
        variant: live ? 'primary' : 'outline',
        size: 'sm',
        className,
      })}
    >
      <Video size={14} aria-hidden="true" />
      Join Meet
    </a>
  );
}
