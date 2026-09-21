import { PortalPageHeader } from '../../components/PortalPageHeader';
import { AssessmentCallsSection } from '../../components/coach-portal/AssessmentCallsSection';
import { AssessmentCallsUnavailable } from '../../components/coach-portal/AssessmentCallsUnavailable';
import { useAppState } from '../../context/AppContext';
import { useAssessmentCalls } from '../../context/AssessmentCallContext';
import { readCoachCallListing } from '../../services/assessmentCallService';
import { browserTimeZone } from '../../utils/dateFormatters';

export function CoachAssessmentCalls() {
  const { bookings } = useAssessmentCalls();
  const { appState } = useAppState();
  const listing = readCoachCallListing(bookings, appState.coachCallsOutcome);

  if (listing.status === 'unavailable') {
    return <AssessmentCallsUnavailable />;
  }

  const now = new Date();
  const timeZone = browserTimeZone();

  return (
    <div className="w-full">
      <PortalPageHeader
        title="Assessment calls"
        subtitle="Everyone who booked a call with you."
      />

      <AssessmentCallsSection
        bookings={listing.bookings}
        now={now}
        timeZone={timeZone}
      />
    </div>
  );
}
