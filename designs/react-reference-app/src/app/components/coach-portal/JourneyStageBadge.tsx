import { COACH_STAGE_LABELS, type JourneyStage } from '../../domain/journey';
import { Badge } from '../ui/badge';

export function JourneyStageBadge({ stage }: { stage: JourneyStage }) {
  return (
    <Badge tone={stage === 'held' ? 'muted' : 'secondary'}>
      {COACH_STAGE_LABELS[stage]}
    </Badge>
  );
}
