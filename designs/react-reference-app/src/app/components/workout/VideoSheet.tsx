import { PlayCircle } from 'lucide-react';
import type { Exercise } from '../../context/TrainingContext';
import { ResponsiveSheetDialog } from './ResponsiveSheetDialog';

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
        <h3 className="text-lg md:text-xl font-semibold text-text-primary pr-10">{exercise.name}</h3>
      </div>

      <div className="px-5 pb-8 md:px-8 md:pb-8 overflow-y-auto space-y-5">
        <div className="aspect-video bg-neutral-900 rounded-xl flex items-center justify-center">
          <PlayCircle size={56} className="text-white/70" />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {exercise.equipment.map(eq => (
            <span key={eq} className="text-xs bg-neutral-100 text-neutral-600 rounded-full px-2.5 py-1">{eq}</span>
          ))}
          {exercise.primaryMuscles.map(m => (
            <span key={m} className="text-xs bg-brand-secondary/10 text-brand-secondary rounded-full px-2.5 py-1">{m}</span>
          ))}
        </div>

        <div>
          <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-2">How to perform</h4>
          <p className="text-sm text-neutral-600 leading-relaxed">{exercise.description}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Difficulty</span>
          <span className="text-xs bg-brand/10 text-brand rounded-full px-2.5 py-0.5 font-medium">
            {exercise.difficulty}
          </span>
        </div>
      </div>
    </ResponsiveSheetDialog>
  );
}
