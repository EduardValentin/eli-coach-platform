import { VideoOff } from 'lucide-react';
import { COACH_CALLS_UNAVAILABLE_MESSAGE } from '../../services/assessmentCallService';

export function AssessmentCallsUnavailable() {
  return (
    <div
      role="alert"
      className="bg-card rounded-panel shadow-soft border border-border/50 flex flex-col items-center px-6 py-16 text-center"
    >
      <div className="w-20 h-20 bg-surface-subtle text-muted-foreground rounded-full flex items-center justify-center mb-6">
        <VideoOff size={36} aria-hidden="true" />
      </div>
      <h1 className="font-serif text-display-md text-text-primary tracking-tight">
        Assessment calls unavailable
      </h1>
      <p className="mt-4 max-w-md text-lg text-text-secondary leading-relaxed">
        {COACH_CALLS_UNAVAILABLE_MESSAGE}
      </p>
    </div>
  );
}
