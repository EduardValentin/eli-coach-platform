import { useToast } from "@eli-coach-platform/ui";
import { useNavigate, useRevalidator, type MetaFunction } from "react-router";

import { useCreateExerciseMutation } from "./api-client";
import { ExerciseEditorDialog } from "./exercise-editor-dialog";

const LIBRARY_PATH = "/coach/training/exercises";

export const meta: MetaFunction = () => [{ title: "Create New Exercise | Evoa" }];

export default function ExerciseCreateRoute() {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { notify } = useToast();
  const mutation = useCreateExerciseMutation();

  return (
    <ExerciseEditorDialog
      exercise={null}
      onDismiss={() => navigate(LIBRARY_PATH)}
      onSaved={async () => {
        notify({ title: "Exercise created", tone: "success" });
        // The library route stays matched across this navigation, so it does
        // not reload on its own.
        await revalidator.revalidate();
        navigate(LIBRARY_PATH);
      }}
      save={(request) => mutation.mutateAsync(request)}
    />
  );
}
