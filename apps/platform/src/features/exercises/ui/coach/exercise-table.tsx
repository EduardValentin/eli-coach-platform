import { cn } from "@eli-coach-platform/ui";
import { Activity, PlayCircle } from "lucide-react";
import { Link } from "react-router";

import { ClearFiltersButton } from "./clear-filters-button";

import type { ExerciseWire } from "~/features/exercises/contracts/exercises";

type ExerciseTableProps = {
  exercises: readonly ExerciseWire[];
  onClearFilters: () => void;
};

// Colour carries the difficulty, as in the prototype: tinted text on a soft
// wash of the same hue rather than a neutral label on a tint.
const DIFFICULTY_TAG_CLASSES = {
  Beginner: "bg-difficulty-beginner-soft text-difficulty-beginner",
  Intermediate: "bg-difficulty-intermediate-soft text-difficulty-intermediate",
  Advanced: "bg-difficulty-advanced-soft text-difficulty-advanced",
} as const;
const HEADER_CLASS = "p-4 text-label uppercase tracking-wide text-text-secondary";
const DETAIL_CLASS = "text-label font-normal normal-case tracking-normal";
const TAG_CLASS = "rounded-xs bg-brand-primary-soft px-1.5 py-0.5 text-tag text-brand-primary";
const MUSCLE_CLASS =
  "rounded-pill bg-brand-secondary-soft px-2 py-0.5 text-tag text-brand-secondary";
const DIFFICULTY_CLASS = "rounded-control px-2 py-1 text-tag font-bold uppercase tracking-wide";

export function ExerciseTable(props: ExerciseTableProps) {
  const { exercises, onClearFilters } = props;

  return (
    <div className="overflow-x-auto rounded-md border border-control-border-soft bg-surface-base shadow-portal-card">
      <table className="w-full border-collapse text-left">
        <caption className="ui-sr-only">Exercise library</caption>
        <thead>
          <tr className="border-b border-control-border-soft bg-surface-subtle">
            <th className={HEADER_CLASS} scope="col">Exercise</th>
            <th className={HEADER_CLASS} scope="col">Target Muscles</th>
            <th className={HEADER_CLASS} scope="col">Difficulty</th>
            <th className={HEADER_CLASS} scope="col">Video</th>
            <th className={cn(HEADER_CLASS, "text-right")} scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {exercises.map((exercise) => (
            <tr
              className="border-b border-border-faint last:border-b-0 hover:bg-surface-subtle"
              key={exercise.id}
            >
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-[0.625rem] bg-surface-subtle text-text-secondary"
                  >
                    <Activity size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-body-sm font-semibold text-text-primary">
                      {exercise.name}
                    </p>
                    {exercise.equipment.length > 0 ? (
                      <p className={cn(DETAIL_CLASS, "truncate text-text-secondary")}>
                        {exercise.equipment.join(", ")}
                      </p>
                    ) : null}
                    {exercise.tags.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {exercise.tags.map((tag) => (
                          <span className={TAG_CLASS} key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </td>
              <td className="p-4">
                <div className="flex flex-wrap gap-1">
                  {exercise.primaryMuscles.map((muscle) => (
                    <span className={MUSCLE_CLASS} key={muscle}>
                      {muscle}
                    </span>
                  ))}
                </div>
              </td>
              <td className="p-4">
                <span className={cn(DIFFICULTY_CLASS, DIFFICULTY_TAG_CLASSES[exercise.difficulty])}>
                  {exercise.difficulty}
                </span>
              </td>
              <td className="p-4">
                {exercise.video ? (
                  <span
                    className={cn(
                      DETAIL_CLASS,
                      "inline-flex items-center gap-1 font-medium text-brand-primary",
                    )}
                  >
                    <PlayCircle aria-hidden="true" size={16} />
                    Attached
                  </span>
                ) : (
                  <span className={cn(DETAIL_CLASS, "text-text-secondary")}>None</span>
                )}
              </td>
              <td className="p-4 text-right">
                <Link
                  aria-label={`Edit ${exercise.name}`}
                  className="text-body-sm font-semibold text-brand-secondary hover:text-brand-secondary-hover"
                  to={`${exercise.id}/edit`}
                >
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {exercises.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-body-sm text-text-secondary">
            No exercises match your search and filters.
          </p>
            <ClearFiltersButton onClear={onClearFilters} />
        </div>
      ) : null}
    </div>
  );
}
