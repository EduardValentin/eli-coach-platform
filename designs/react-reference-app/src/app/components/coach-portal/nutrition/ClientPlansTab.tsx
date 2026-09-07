import { useNavigate } from 'react-router';
import { useNutrition } from '../../../context/NutritionContext';
import { useClientProfile, fullName } from '../../../context/ClientProfileContext';
import { Button } from '../../ui/button';
import { format, parseISO } from 'date-fns';

export function ClientPlansTab() {
  const navigate = useNavigate();
  const { listProfiles } = useClientProfile();
  const { getPlan } = useNutrition();
  const clients = listProfiles();

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {clients.map((c) => {
        const plan = getPlan(c.id);
        const active = plan?.blocks.find((b) => b.status === 'active');
        return (
          <li key={c.id} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground">{fullName(c)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {active
                ? `Active block · ${format(parseISO(active.startDate), 'MMM d')}–${format(parseISO(active.days[active.days.length - 1].date), 'MMM d')}`
                : 'No nutrition plan yet'}
            </p>
            <Button
              variant={active ? 'outline' : 'default'}
              size="sm"
              className="mt-3"
              onClick={() => navigate(`/coach/nutrition/client/${c.id}/plan`)}
            >
              {active ? 'Open plan' : 'Build plan'}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
