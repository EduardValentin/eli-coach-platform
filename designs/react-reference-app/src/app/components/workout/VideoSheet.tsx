import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '../ui/drawer';
import { PlayCircle, X } from 'lucide-react';
import type { Exercise } from '../../context/TrainingContext';

interface VideoSheetProps {
  exercise: Exercise;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VideoSheet({ exercise, open, onOpenChange }: VideoSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="flex flex-row items-center justify-between px-5 pt-4 pb-2">
          <DrawerTitle className="text-lg font-semibold text-[#121212]">{exercise.name}</DrawerTitle>
          <DrawerClose asChild>
            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors shrink-0">
              <X size={18} className="text-neutral-500" />
            </button>
          </DrawerClose>
        </DrawerHeader>

        <div className="px-5 pb-8 overflow-y-auto space-y-5">
          {/* Video placeholder */}
          <div className="aspect-video bg-neutral-900 rounded-xl flex items-center justify-center">
            <PlayCircle size={56} className="text-white/70" />
          </div>

          {/* Equipment & muscles */}
          <div className="flex flex-wrap gap-1.5">
            {exercise.equipment.map(eq => (
              <span key={eq} className="text-xs bg-neutral-100 text-neutral-600 rounded-full px-2.5 py-1">{eq}</span>
            ))}
            {exercise.primaryMuscles.map(m => (
              <span key={m} className="text-xs bg-[#00796B]/10 text-[#00796B] rounded-full px-2.5 py-1">{m}</span>
            ))}
          </div>

          {/* How to perform */}
          <div>
            <h4 className="text-sm font-bold text-[#121212] uppercase tracking-wider mb-2">How to perform</h4>
            <p className="text-sm text-neutral-600 leading-relaxed">{exercise.description}</p>
          </div>

          {/* Difficulty */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Difficulty</span>
            <span className="text-xs bg-[#C81D6B]/10 text-[#C81D6B] rounded-full px-2.5 py-0.5 font-medium">
              {exercise.difficulty}
            </span>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
