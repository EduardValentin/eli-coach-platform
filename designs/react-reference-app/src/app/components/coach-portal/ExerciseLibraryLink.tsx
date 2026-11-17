import { Pencil } from 'lucide-react';
import { Link } from 'react-router';
import type { Exercise } from '../../context/TrainingContext';
import { Button } from '../ui/button';

export function ExerciseLibraryLink({ exercise }: { exercise: Exercise }) {
  return (
    <div className="flex justify-end">
      <Button variant="outline" size="sm" asChild>
        <Link to={`/coach/training/exercises/${exercise.id}`}>
          <Pencil aria-hidden="true" />
          Edit in exercise library
        </Link>
      </Button>
    </div>
  );
}
