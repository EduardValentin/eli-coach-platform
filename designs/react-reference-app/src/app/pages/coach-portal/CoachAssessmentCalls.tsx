import { AssessmentCallsSection } from '../../components/coach-portal/AssessmentCallsSection';
import { useAssessmentCalls } from '../../context/AssessmentCallContext';
import { browserTimeZone } from '../../utils/dateFormatters';

export function CoachAssessmentCalls() {
  const { bookings } = useAssessmentCalls();
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
        bookings={bookings}
        now={now}
        timeZone={timeZone}
      />
    </div>
  );
}
