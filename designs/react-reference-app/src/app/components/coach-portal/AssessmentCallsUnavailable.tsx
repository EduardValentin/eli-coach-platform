import { VideoOff } from 'lucide-react';
import { COACH_CALLS_UNAVAILABLE_MESSAGE } from '../../services/assessmentCallService';
import { DeadEndPanel } from '../ErrorPage';

export function AssessmentCallsUnavailable() {
  return (
    <div className="w-full" data-parity-root="AssessmentCallsUnavailable">
      <DeadEndPanel
        icon={VideoOff}
        title="Assessment calls unavailable"
        description={COACH_CALLS_UNAVAILABLE_MESSAGE}
      />
    </div>
  );
}
