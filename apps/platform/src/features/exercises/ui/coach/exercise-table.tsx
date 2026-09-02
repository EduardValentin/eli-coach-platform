import { Badge, cn } from "@eli-coach-platform/ui";
import { Activity, PlayCircle } from "lucide-react";
import { Link } from "react-router";

import type { ExerciseWire } from "~/features/exercises/contracts/exercises";

type ExerciseTableProps = {
  exercises: readonly ExerciseWire[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
};

const DIFFICULTY_BADGE_VARIANTS = {
  Beginner: "success",
  Intermediate: "pending",
  Advanced: "destructive",
} as const;
const HEADER_CLASS = "p-4 text-label uppercase text-text-muted";
const DETAIL_CLASS = "text-label normal-case tracking-normal";

export function ExerciseTable(props: ExerciseTableProps) {
  const { exercises, hasActiveFilters, onClearFilters } = props;

  if (exercises.length === 0) {
    return (
      <section className="rounded-panel border border-border-subtle bg-surface-base p-8 text-center shadow-soft">
        <p className="text-body-sm text-text-secondary">
          No exercises match your search and filters.
        </p>
        {hasActiveFilters ? (
          <button
            className="mt-2 min-h-6 px-2 text-body-sm font-semibold text-brand-primary hover:text-brand-primary-hover"
            onClick={onClearFilters}
            type="button"
          >
            Clear search and filters
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <div className="overflow-x-auto rounded-panel border border-border-subtle bg-surface-base shadow-soft">
      <table className="w-full border-collapse text-left">
        <caption className="ui-sr-only">Exercise library</caption>
        <thead>
          <tr className="border-b border-border-subtle bg-surface-subtle">
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
              className="border-b border-border-subtle last:border-b-0 hover:bg-surface-subtle"
              key={exercise.id}
            >
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-subtle text-text-secondary"
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
                          <Badge className="normal-case tracking-normal" key={tag}>
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </td>
              <td className="p-4">
                <div className="flex flex-wrap gap-1">
                  {exercise.primaryMuscles.map((muscle) => (
                    <Badge
                      className="normal-case tracking-normal"
                      key={muscle}
                      variant="secondary"
                    >
                      {muscle}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="p-4">
                <Badge variant={DIFFICULTY_BADGE_VARIANTS[exercise.difficulty]}>
                  {exercise.difficulty}
                </Badge>
              </td>
              <td className="p-4">
                {exercise.video ? (
                  <span className={cn(DETAIL_CLASS, "inline-flex items-center gap-1 text-brand-primary")}>
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
    </div>
  );
}
