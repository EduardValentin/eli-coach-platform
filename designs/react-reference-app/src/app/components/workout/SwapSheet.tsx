import { Check, ArrowLeftRight } from 'lucide-react';
import type { Exercise } from '../../context/TrainingContext';
import { BottomSheet } from '../ui/bottom-sheet';

interface SwapSheetProps {
  currentExerciseId: string;
  variants: Exercise[];
  originalExercise: Exercise;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwap: (exerciseId: string) => void;
}

export function SwapSheet({ currentExerciseId, variants, originalExercise, open, onOpenChange, onSwap }: SwapSheetProps) {
  const allOptions = [originalExercise, ...variants.filter(v => v.id !== originalExercise.id)];

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Swap exercise"
      className="max-h-[70vh] flex flex-col"
    >
      <div className="flex items-center gap-2 px-5 pt-2 pb-3 border-b border-neutral-100">
        <ArrowLeftRight size={16} className="text-brand-secondary" />
        <h2 className="text-base font-semibold text-text-primary">Swap Exercise</h2>
      </div>

      <div className="px-5 pt-3 pb-5 space-y-2 overflow-y-auto">
        {allOptions.map(ex => {
          const isActive = ex.id === currentExerciseId;
          return (
            <button
              key={ex.id}
              type="button"
              onClick={() => { onSwap(ex.id); onOpenChange(false); }}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                isActive
                  ? 'border-brand-secondary bg-brand-secondary/5'
                  : 'border-neutral-200 bg-white hover:border-neutral-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-text-primary">{ex.name}</span>
                {isActive && <Check size={18} className="text-brand-secondary" />}
              </div>
              <div className="flex gap-1 overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {ex.equipment.map(eq => (
                  <span key={eq} className="shrink-0 text-[10px] bg-neutral-100 text-text-secondary rounded-full px-2 py-0.5">{eq}</span>
                ))}
                {ex.primaryMuscles.map(m => (
                  <span key={m} className="shrink-0 text-[10px] bg-brand-secondary/10 text-brand-secondary rounded-full px-2 py-0.5">{m}</span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
