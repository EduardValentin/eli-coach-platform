import { EXERCISE_LIBRARY_PATH } from "./exercise-library-page";
import { useToast } from "@eli-coach-platform/ui";
import {
  useLoaderData,
  useNavigate,
  useRevalidator,
  type MetaFunction,
} from "react-router";

import { useUpdateExerciseMutation } from "./api-client";
import { loader } from "./exercise-edit-page.server";
import { ExerciseEditorDialog } from "./exercise-editor-dialog";

// Registered in routes.ts, so the loader lives in the `.server.ts` sibling.
export { loader };

export const meta: MetaFunction = () => [{ title: "Edit Exercise | Evoa" }];

export default function ExerciseEditRoute() {
  const exercise = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { notify } = useToast();
  const mutation = useUpdateExerciseMutation(exercise.id);

  return (
    <ExerciseEditorDialog
      exercise={exercise}
      onDismiss={() => navigate(EXERCISE_LIBRARY_PATH)}
      onSaved={async () => {
        notify({ title: "Exercise updated", tone: "success" });
        await revalidator.revalidate();
        navigate(EXERCISE_LIBRARY_PATH);
      }}
      save={(request) => mutation.mutateAsync(request)}
    />
  );
}
