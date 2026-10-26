import { useNavigate } from 'react-router';
import { useClientJourneys } from '../../../context/ClientJourneyContext';
import { useNutrition } from '../../../context/NutritionContext';
import { isBeforeStage } from '../../../domain/journey';
import { clientIdForJourney, journeyClientName } from '../../../utils/journeyLabels';
import { Button } from '../../ui/button';
import { format, parseISO } from 'date-fns';

export function ClientPlansTab() {
  const navigate = useNavigate();
  const { journeys } = useClientJourneys();
  const { getPlan } = useNutrition();
  const clients = Object.values(journeys).filter((journey) => !isBeforeStage(journey.stage, 'invited'));

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {clients.map((journey) => {
        const clientId = clientIdForJourney(journey);
        const plan = getPlan(clientId);
        const active = plan?.blocks.find((b) => b.status === 'active');
        return (
          <li
            key={journey.callId}
            className="rounded-card border border-border bg-card p-4"
          >
            <p className="text-sm font-semibold text-text-primary">
              {journeyClientName(journey)}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              {active
                ? `Active block · ${format(parseISO(active.startDate), 'MMM d')}–${format(parseISO(active.days[active.days.length - 1].date), 'MMM d')}`
                : 'No nutrition plan yet'}
            </p>
            <Button
              variant={active ? 'outline' : 'primary'}
              size="xs"
              className="mt-3"
              onClick={() => navigate(`/coach/nutrition/client/${clientId}/plan`)}
            >
              {active ? 'Open plan' : 'Build plan'}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
