import { useState } from 'react';
import { Info } from 'lucide-react';
import type { Exercise } from '../../context/TrainingContext';
import { VideoSheet } from './VideoSheet';

type PlanExercise = {
  id: string;
  sets: number | string;
  reps: number | string;
  rir: number | string;
};

interface PlanExerciseRowProps {
  planExercise: PlanExercise;
  exercise: Exercise;
}

export function PlanExerciseRow({ planExercise, exercise }: PlanExerciseRowProps) {
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3 sm:gap-4 rounded-xl px-2 sm:px-3 py-2 hover:bg-neutral-50 transition-colors">
        <button
          type="button"
          onClick={() => setVideoOpen(true)}
          aria-label={`${exercise.name} details`}
          title="Exercise details"
          className="shrink-0 inline-flex items-center justify-center size-11 rounded-full bg-[#C81D6B] text-white hover:bg-[#a31556] active:scale-95 transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-[#C81D6B]/40"
        >
          <Info size={20} />
        </button>

        <h4 className="flex-1 min-w-0 font-semibold text-[#121212] text-[15px] sm:text-base leading-tight truncate">
          {exercise.name}
        </h4>

        <div className="shrink-0 text-right leading-tight">
          <p className="font-serif font-semibold text-base text-[#121212] tabular-nums">
            {planExercise.sets} &times; {planExercise.reps}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5 tabular-nums">
            <span className="font-bold text-[#C81D6B] tracking-wider">RIR</span> {planExercise.rir}
          </p>
        </div>
      </div>

      <VideoSheet exercise={exercise} open={videoOpen} onOpenChange={setVideoOpen} />
    </>
  );
}
