import { Plus } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { ExerciseLibrary } from '../../components/coach-portal/ExerciseLibrary';
import { Button } from '../../components/ui/button';

export function TrainingHub() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="w-full" data-parity-root="TrainingHub">
      <PortalPageHeader
        title="Exercises"
        subtitle="Build the exercise library your programs draw from."
        actions={
          <Button asChild variant="primary" size="md">
            <Link to="/coach/training/exercises/new" state={{ library: location.search }}>
              <Plus aria-hidden="true" />
              New exercise
            </Link>
          </Button>
        }
      />

      <ExerciseLibrary
        onEdit={(exerciseId) =>
          navigate(`/coach/training/exercises/${exerciseId}`, { state: { library: location.search } })
        }
      />
    </div>
  );
}
