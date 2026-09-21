import { CalendarX } from 'lucide-react';
import { Link } from 'react-router';
import { ERROR_PAGE_ACTION_CLASS, ErrorPage } from '../../components/ErrorPage';

const TITLE = 'Your coaching has ended';

const DESCRIPTION =
  "It was good to train together. Whenever you want to pick it back up, your plan and your history are waiting for you.";

export function PortalEnded() {
  return (
    <ErrorPage
      description={DESCRIPTION}
      eyebrow="Your coaching"
      icon={CalendarX}
      landmarkLabel={TITLE}
      title={TITLE}
    >
      <Link className={ERROR_PAGE_ACTION_CLASS} to="/pricing">
        Subscribe again
      </Link>
    </ErrorPage>
  );
}
