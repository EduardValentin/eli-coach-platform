import { useState } from 'react';
import type { Exercise } from '../../context/TrainingContext';
import { VideoSheet } from './VideoSheet';
import { RirBadge } from './RirBadge';

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

function abbreviate(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
}

export function PlanExerciseRow({ planExercise, exercise }: PlanExerciseRowProps) {
  const [videoOpen, setVideoOpen] = useState(false);
  const initials = abbreviate(exercise.name);

  return (
    <>
      <button
        type="button"
        onClick={() => setVideoOpen(true)}
        aria-label={`${exercise.name} details`}
        className="w-full flex items-center gap-3 sm:gap-4 rounded-xl px-2 sm:px-3 py-2 hover:bg-neutral-50 transition-colors text-left outline-none focus-visible:ring-[3px] focus-visible:ring-[#C81D6B]/30"
      >
        <span aria-hidden="true" className="shrink-0 size-10 rounded-lg overflow-hidden bg-neutral-100 flex items-center justify-center">
          {exercise.thumbnailUrl ? (
            <img src={exercise.thumbnailUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[11px] font-bold text-neutral-600 tracking-wider">{initials}</span>
          )}
        </span>

        <span className="flex-1 min-w-0 text-[#121212] text-[15px] sm:text-base leading-tight truncate">
          {exercise.name}
        </span>

        <span className="shrink-0 text-right leading-tight flex flex-col items-end gap-1">
          <span className="font-serif font-semibold text-base text-[#121212] tabular-nums">
            {planExercise.sets} &times; {planExercise.reps}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-[11px] text-neutral-600 font-medium tracking-wider">RIR</span>
            <RirBadge value={planExercise.rir} />
          </span>
        </span>
      </button>

      <VideoSheet exercise={exercise} open={videoOpen} onOpenChange={setVideoOpen} />
    </>
  );
}
