import { useEffect } from 'react';
import { VideoOff } from 'lucide-react';
import { useParams } from 'react-router';
import {
  ErrorPage,
  ErrorPageLink,
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
      <main aria-label="Your call" className={FULL_PAGE_MESSAGE_SHELL_CLASS}>
        <p role="status" className="text-text-secondary">
          Taking you to your call…
        </p>
      </main>
    );
  }

  return (
    <ErrorPage
      icon={VideoOff}
      title="Your call link isn't ready yet"
      description="The meeting room for this call hasn't been set up yet. Check back before your call, or reply to your confirmation email and we'll send the link."
      landmarkLabel="Your call"
    >
      <ErrorPageLink direction="back" to="/">
        Back to home
      </ErrorPageLink>
    </ErrorPage>
  );
}
