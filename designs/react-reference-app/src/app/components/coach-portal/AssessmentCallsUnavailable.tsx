import { VideoOff } from 'lucide-react';
import { COACH_CALLS_UNAVAILABLE_MESSAGE } from '../../services/assessmentCallService';
import { DeadEndContent } from '../ErrorPage';

export function AssessmentCallsUnavailable() {
  return (
    <div className="max-w-4xl mx-auto pb-12 lg:px-8 lg:pt-8">
      <div
        role="alert"
        className="bg-surface-base rounded-panel shadow-soft border border-border-default/50 flex flex-col items-center px-6 py-16 text-center"
      >
        <DeadEndContent
          icon={VideoOff}
          title="Assessment calls unavailable"
          description={COACH_CALLS_UNAVAILABLE_MESSAGE}
        />
      </div>
    </div>
  );
}
