import { Check, ArrowLeftRight } from 'lucide-react';
import type { Exercise } from '../../context/TrainingContext';
import { BottomSheet } from '../ui/bottom-sheet';
import { Badge } from '../ui/badge';
import { WIDGET_TITLE_CLASS } from '../typography';

interface SwapSheetProps {
  currentExerciseId: string;
  variants: Exercise[];
  originalExercise: Exercise;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwap: (exerciseId: string) => void;
}

export function SwapSheet({
  currentExerciseId,
  variants,
  originalExercise,
  open,
  onOpenChange,
  onSwap,
}: SwapSheetProps) {
  const allOptions = [
    originalExercise,
    ...variants.filter((v) => v.id !== originalExercise.id),
  ];

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Swap exercise"
      className="max-h-[70vh] flex flex-col"
    >
      <div className="flex items-center gap-2 px-5 pt-2 pb-3 border-b border-border-subtle rounded-field">
        <ArrowLeftRight size={16} className="text-brand-secondary" />
        <h2 className={WIDGET_TITLE_CLASS}>Swap Exercise</h2>
      </div>

      <div className="px-5 pt-3 pb-5 space-y-2 overflow-y-auto">
        {allOptions.map((ex) => {
          const isActive = ex.id === currentExerciseId;
          return (
            <button
              key={ex.id}
              type="button"
              onClick={() => {
                onSwap(ex.id);
                onOpenChange(false);
              }}
              className={`w-full text-left p-4 rounded-control border transition-all ${
                isActive
                  ? 'border-brand-secondary bg-brand-secondary-soft'
                  : 'border-border bg-surface-base hover:border-text-secondary/30'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-text-primary">
                  {ex.name}
                </span>
                {isActive && (
                  <Check size={18} className="text-brand-secondary" />
                )}
              </div>
              <div className="flex gap-1 overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {ex.equipment.map((eq) => (
                  <Badge key={eq} variant="muted" className="shrink-0">
                    {eq}
                  </Badge>
                ))}
                {ex.primaryMuscles.map((m) => (
                  <Badge key={m} variant="brand-secondary" className="shrink-0">
                    {m}
                  </Badge>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
