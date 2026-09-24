import { PlayCircle } from 'lucide-react';
import type { Exercise } from '../../context/TrainingContext';
import { ResponsiveSheetDialog } from './ResponsiveSheetDialog';
import { Badge } from '../ui/badge';
import { LABEL_CLASS } from '../typography';

interface VideoSheetProps {
  exercise: Exercise;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VideoSheet({ exercise, open, onOpenChange }: VideoSheetProps) {
  return (
    <ResponsiveSheetDialog
      open={open}
      onOpenChange={onOpenChange}
      title={exercise.name}
      description={exercise.description}
    >
      <div className="px-5 pt-6 pb-4 md:px-8 md:pt-8">
        <h3 className="text-lg md:text-xl font-semibold text-text-primary pr-10">
          {exercise.name}
        </h3>
      </div>

      <div className="px-5 pb-8 md:px-8 md:pb-8 overflow-y-auto space-y-5">
        <div className="aspect-video bg-surface-inverted rounded-control flex items-center justify-center">
          <PlayCircle
            size={56}
            className="text-surface-inverted-foreground/70"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {exercise.equipment.map((eq) => (
            <Badge key={eq} variant="muted">
              {eq}
            </Badge>
          ))}
          {exercise.primaryMuscles.map((m) => (
            <Badge key={m} variant="brand-secondary">
              {m}
            </Badge>
          ))}
        </div>

        <div>
          <h4 className={`${LABEL_CLASS} mb-2`}>How to perform</h4>
          <p className="text-sm text-text-secondary leading-relaxed">
            {exercise.description}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={LABEL_CLASS}>Difficulty</span>
          <Badge className="border-primary/20 bg-primary-soft text-primary">
            {exercise.difficulty}
          </Badge>
        </div>
      </div>
    </ResponsiveSheetDialog>
  );
}
