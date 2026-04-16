import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '../ui/drawer';
import { X, Check, ArrowLeftRight } from 'lucide-react';
import type { Exercise } from '../../context/TrainingContext';

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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[70vh]">
        <DrawerHeader className="flex flex-row items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <ArrowLeftRight size={16} className="text-[#00796B]" />
            <DrawerTitle className="text-lg font-semibold text-[#121212]">Swap Exercise</DrawerTitle>
          </div>
          <DrawerClose asChild>
            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors shrink-0">
              <X size={18} className="text-neutral-500" />
            </button>
          </DrawerClose>
        </DrawerHeader>

        <div className="px-5 pb-8 space-y-2 overflow-y-auto">
          {allOptions.map(ex => {
            const isActive = ex.id === currentExerciseId;
            return (
              <button
                key={ex.id}
                onClick={() => { onSwap(ex.id); onOpenChange(false); }}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  isActive
                    ? 'border-[#00796B] bg-[#00796B]/5'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-[#121212]">{ex.name}</span>
                  {isActive && <Check size={18} className="text-[#00796B]" />}
                </div>
                <div className="flex flex-wrap gap-1">
                  {ex.equipment.map(eq => (
                    <span key={eq} className="text-[10px] bg-neutral-100 text-neutral-500 rounded-full px-2 py-0.5">{eq}</span>
                  ))}
                  {ex.primaryMuscles.map(m => (
                    <span key={m} className="text-[10px] bg-[#00796B]/10 text-[#00796B] rounded-full px-2 py-0.5">{m}</span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
