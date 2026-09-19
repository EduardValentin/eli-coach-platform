import { AssessmentCallsSection } from '../../components/coach-portal/AssessmentCallsSection';
import { useAssessmentCalls } from '../../context/AssessmentCallContext';
import { browserTimeZone, nameTimeZone } from '../../utils/dateFormatters';

export function CoachAssessmentCalls() {
  const { bookings } = useAssessmentCalls();
  const now = new Date();
  const timeZone = browserTimeZone();

  return (
    <div className="w-full pb-12">
      <header className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-serif font-medium text-text-primary">
          Assessment calls
        </h1>
        <p className="text-text-secondary mt-2">
          Times in {nameTimeZone(timeZone, now)}
        </p>
      </header>

      <AssessmentCallsSection
        bookings={bookings}
        now={now}
        timeZone={timeZone}
      />
    </div>
  );
}
