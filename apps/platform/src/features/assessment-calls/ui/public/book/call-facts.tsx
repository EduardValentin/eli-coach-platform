import { ASSESSMENT_CALL_RULES } from "@eli-coach-platform/domain/coach-availability";
import { Clock, Video } from "lucide-react";

export function CallFacts() {
  return (
    <ul className="mb-12 flex flex-wrap gap-x-8 gap-y-3 text-copy-muted">
      <li className="flex items-center gap-3">
        <Clock aria-hidden="true" size={18} />
        {ASSESSMENT_CALL_RULES.durationMinutes} min call
      </li>
      <li className="flex items-center gap-3">
        <Video aria-hidden="true" size={18} />
        Video call
      </li>
    </ul>
  );
}
