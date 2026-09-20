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
    <div className="max-w-4xl mx-auto pb-12 lg:px-8 lg:pt-8">
      <header className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-serif font-medium text-text-primary">
          Assessment calls
        </h1>
      </header>

      <AssessmentCallsSection
        bookings={listing.bookings}
        now={now}
        timeZone={timeZone}
      />
    </div>
  );
}
