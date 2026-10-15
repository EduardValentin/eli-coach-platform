import { EmptyState, PortalPageHeader } from "@eli-coach-platform/ui/portal";
import {
  Badge,
  buttonVariants,
  Card,
  RowActionsMenu,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@eli-coach-platform/ui/primitives";
import { Activity, Dumbbell, Pencil, Plus } from "lucide-react";
import {
  Link,
  useLoaderData,
  useNavigate,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import type { ExerciseView } from "~/features/exercise-library/public/exercises";
import {
  exerciseEditorPath,
  NEW_EXERCISE_PATH,
} from "~/features/exercise-library/public/paths";
import { exerciseLibraryContext } from "~/features/exercise-library/server/guards/exercise-library-context.server";

import { EXERCISE_TYPE_LABELS } from "./exercise-form";

const COLUMN_COUNT = 5;

export async function loader(args: LoaderFunctionArgs) {
  return args.context.get(exerciseLibraryContext).exerciseLibrary.list(args);
}

export const meta: MetaFunction = () => [{ title: "Exercises | Evoa" }];

export default function ExerciseLibraryRoute() {
  const { exercises } = useLoaderData<typeof loader>();

  return (
    <div className="w-full" data-parity-root="TrainingHub">
      <PortalPageHeader
        actions={
          <Link
            className={buttonVariants({ size: "md", variant: "primary" })}
            to={NEW_EXERCISE_PATH}
          >
            <Plus aria-hidden="true" size={16} />
            New exercise
          </Link>
        }
        subtitle="Build the exercise library your plans draw from."
        title="Exercises"
      />

      <Card data-parity="exercise-table" variant="table-panel">
        <Table>
          <TableHeader>
            <TableRow data-parity="exercise-header-row">
              <TableHead>Exercise</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Target muscles</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exercises.length === 0 ? (
              <TableRow>
                <TableCell className="p-0" colSpan={COLUMN_COUNT}>
                  <EmptyState
                    description="Exercises you add appear here."
                    icon={Dumbbell}
                    title="No exercises yet"
                  />
                </TableCell>
              </TableRow>
            ) : (
              exercises.map((exercise) => (
                <ExerciseRow exercise={exercise} key={exercise.id} />
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function ExerciseRow({ exercise }: { exercise: ExerciseView }) {
  const navigate = useNavigate();
  const equipment =
    exercise.equipment.length > 0
      ? exercise.equipment.join(", ")
      : "No equipment";

  return (
    <TableRow data-parity="exercise-row">
      <TableCell>
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-quiet text-text-secondary"
            data-parity="exercise-glyph"
          >
            <Activity size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">
              {exercise.name}
            </p>
            <p
              className="mt-0.5 text-xs text-text-secondary"
              data-parity="exercise-summary"
            >
              {`${EXERCISE_TYPE_LABELS[exercise.type]} · ${equipment}`}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1" data-parity="exercise-tags">
          {exercise.tags.map((tag) => (
            <Badge key={tag} tone="brand-secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1" data-parity="exercise-muscles">
          {exercise.primaryMuscles.map((muscle) => (
            <Badge key={muscle} tone="muted">
              {muscle}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell>
        <Badge data-parity="exercise-difficulty" tone="secondary">
          {exercise.difficulty}
        </Badge>
      </TableCell>
      <TableCell data-parity="exercise-actions-cell">
        <div
          className="flex items-center justify-end"
          data-parity="library-item-actions"
        >
          <RowActionsMenu
            actions={[
              {
                icon: Pencil,
                label: "Edit",
                name: "edit",
                onSelect: () => void navigate(exerciseEditorPath(exercise.id)),
              },
            ]}
            label={`Actions for ${exercise.name}`}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
