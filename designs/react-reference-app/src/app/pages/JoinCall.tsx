import { useEffect } from 'react';
import { ArrowRight, VideoOff } from 'lucide-react';
import { Link, useParams } from 'react-router';
import {
  ERROR_PAGE_ACTION_CLASS,
  ErrorPage,
  FULL_PAGE_MESSAGE_SHELL_CLASS,
} from '../components/ErrorPage';
import { useAssessmentCalls } from '../context/AssessmentCallContext';
import { NotFound } from './NotFound';

export function JoinCall() {
  const { bookingId } = useParams();
  const { findBooking, settings } = useAssessmentCalls();
  const booking = bookingId ? findBooking(bookingId) : undefined;
  const meetingLink = settings.meetingLink;

  useEffect(() => {
    if (booking && meetingLink) {
      window.location.assign(meetingLink);
    }
  }, [booking, meetingLink]);

  if (!booking) return <NotFound />;

  if (meetingLink) {
    return (
      <main aria-label="Assessment call" className={FULL_PAGE_MESSAGE_SHELL_CLASS}>
        <p role="status" className="text-text-secondary">
          Taking you to your call…
        </p>
      </main>
    );
  }

  return (
    <ErrorPage
      icon={VideoOff}
      eyebrow="Assessment call"
      title="Your call link isn't ready yet"
      description="The meeting room for this call hasn't been set up yet. Check back before your call, or reply to your confirmation email and we'll send the link."
    >
      <Link to="/" className={ERROR_PAGE_ACTION_CLASS}>
        Back to home <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </ErrorPage>
  );
}
