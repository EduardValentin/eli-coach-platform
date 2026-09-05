import { cn, inputClasses } from "@eli-coach-platform/ui";
import { Activity, Search } from "lucide-react";
import { useState } from "react";
import { Outlet, useLoaderData, type MetaFunction } from "react-router";

import { ExerciseFilters } from "./exercise-filters";
import {
  matchesExerciseFilters,
  toggleExerciseFilter,
  type ExerciseFilter,
} from "./exercise-filtering";
import { loader } from "./exercise-library-page.server";
import { ExerciseTable } from "./exercise-table";

// Registered in routes.ts, so this file cannot carry the `.server` suffix and
// its loader lives in the sibling `exercise-library-page.server.ts`.
export { loader };

/** The library route, shared by the pages that link back to it and the surface that frames it. */
export const EXERCISE_LIBRARY_PATH = "/coach/training/exercises";

export const meta: MetaFunction = () => [{ title: "Exercise Library | Evoa" }];

export default function ExerciseLibraryRoute() {
  const { exercises } = useLoaderData<typeof loader>();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<ExerciseFilter[]>([]);
  const filtered = exercises.filter((exercise) =>
    matchesExerciseFilters({ activeFilters, exercise, searchQuery }),
  );

  function clearFilters() {
    setActiveFilters([]);
    setSearchQuery("");
  }

  return (
    <div className="flex flex-col gap-6">
      {exercises.length === 0 ? (
        <section className="py-16 text-center">
          <Activity aria-hidden="true" className="mx-auto mb-3 text-text-muted" size={32} />
          <p className="text-body-sm text-text-secondary">
            No exercises yet. Create your first exercise.
          </p>
        </section>
      ) : (
        <>
          {/* The reference sets 16px between the search field and the filters,
              and 24px before the table. */}
          <div className="flex flex-col gap-4">
            <label className="relative block max-w-md">
              <span className="ui-sr-only">Search exercises</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
                size={20}
              />
              <input
                className={cn(inputClasses({ variant: "portal" }), "pl-11 text-body-sm")}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search exercises by name or muscle..."
                type="search"
                value={searchQuery}
              />
            </label>
            <ExerciseFilters
              activeFilters={activeFilters}
              hasSearchQuery={Boolean(searchQuery)}
              onClearFilters={clearFilters}
              onToggleFilter={(filter) =>
                setActiveFilters((current) => toggleExerciseFilter(current, filter))
              }
            />
          </div>
          <ExerciseTable
            exercises={filtered}
            onClearFilters={clearFilters}
          />
        </>
      )}
      <Outlet />
    </div>
  );
}
