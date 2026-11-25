import { CirclePlay } from "lucide-react";
import { useId } from "react";

import type { LibraryExercise } from "~/bounded-contexts/programs/training-programs/public/program-editing";
import { cn } from "~/shared/design-system/lib";
import { Badge, linkVariants } from "~/shared/design-system/primitives";

import {
  useOpenExerciseDetail,
  type ExerciseDetailContent,
} from "./exercise-detail-content";
import { InlineTextButton } from "./inline-text-button";
import { exerciseNameOf } from "./program-view";

type NameWeight = "semibold" | "medium";

type NameSize = "base" | "compact";

const ROW_CLASS: Record<NameSize, string> = {
  base: "min-h-12",
  compact: "min-h-10",
};
const TEXT_SIZE: Record<NameSize, "base" | "sm"> = {
  base: "base",
  compact: "sm",
};
const PLAIN_TEXT_CLASS: Record<NameSize, string> = {
  base: "text-base",
  compact: "text-sm",
};
const PLAIN_WEIGHT_CLASS: Record<NameWeight, string> = {
  semibold: "font-semibold",
  medium: "font-medium",
};

function ExerciseNameWords({ exercise }: { exercise: LibraryExercise }) {
  const words = exercise.name.split(" ");
  const lastWord = words.pop();

  return (
    <>
      {words.length > 0 && `${words.join(" ")} `}
      <span className="whitespace-nowrap">
        {lastWord}
        {exercise.videoPath && (
          <CirclePlay
            aria-hidden="true"
            className="ml-2 inline size-[1em] align-[-0.15em] text-primary"
          />
        )}
      </span>
    </>
  );
}

export function ExerciseNameMark({ exercise }: { exercise: LibraryExercise }) {
  return (
    <span className={cn(linkVariants({ variant: "underlined" }), "min-w-0")}>
      <ExerciseNameWords exercise={exercise} />
    </span>
  );
}

function spokenOpens(exercise: LibraryExercise): string {
  return exercise.videoPath ? "cues and video" : "cues";
}

type ExerciseNameButtonProps = {
  exercise: LibraryExercise | undefined;
  detail: ExerciseDetailContent | null;
  weight?: NameWeight;
  size?: NameSize;
};

export function ExerciseNameButton({
  exercise,
  detail,
  weight = "semibold",
  size = "base",
}: ExerciseNameButtonProps) {
  const openDetail = useOpenExerciseDetail();
  const opensId = useId();

  if (!detail) {
    return (
      <span
        className={cn(
          "inline-flex flex-wrap items-center gap-2 leading-snug text-text-primary",
          ROW_CLASS[size],
          PLAIN_TEXT_CLASS[size],
          PLAIN_WEIGHT_CLASS[weight],
        )}
      >
        {exerciseNameOf(exercise)}
        {exercise?.archived && <Badge tone="muted">archived</Badge>}
      </span>
    );
  }

  return (
    <>
      <InlineTextButton
        aria-haspopup="dialog"
        aria-describedby={opensId}
        size={TEXT_SIZE[size]}
        weight={weight}
        className={cn("leading-snug", ROW_CLASS[size])}
        onClick={(event) => openDetail(detail, event.currentTarget)}
      >
        <ExerciseNameWords exercise={detail.exercise} />
      </InlineTextButton>
      <span id={opensId} aria-hidden="true" className="sr-only">
        {spokenOpens(detail.exercise)}
      </span>
    </>
  );
}
