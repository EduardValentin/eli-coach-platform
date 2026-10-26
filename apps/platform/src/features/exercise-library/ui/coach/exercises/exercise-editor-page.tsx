import {
  useUploadState,
  type UploadState,
} from "@eli-coach-platform/infrastructure/http";
import { useSaveFetcher, type SaveOutcome } from "@eli-coach-platform/ui/lib";
import {
  PortalBackLink,
  PortalPageHeader,
} from "@eli-coach-platform/ui/portal";
import { Button, buttonVariants } from "@eli-coach-platform/ui/primitives";
import { toast } from "@eli-coach-platform/ui/toast";
import { Check } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
import {
  Link,
  useLoaderData,
  useLocation,
  useNavigate,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { exerciseVideoUploadProgress } from "~/features/exercise-library/public/exercise-video-upload-progress";
import {
  exerciseProblemsAnswerSchema,
  exerciseSavedAnswerSchema,
  type ExerciseEditorView,
  type ExerciseProblems,
} from "~/features/exercise-library/public/exercises";
import {
  EXERCISE_LIBRARY_API_PATHS,
  exercisePath,
} from "~/features/exercise-library/public/paths";
import { exerciseLibraryContext } from "~/features/exercise-library/server/guards/exercise-library-context.server";

import {
  ExerciseAboutSection,
  ExerciseCoachingSection,
  ExerciseWorkSection,
} from "./exercise-editor-sections";
import {
  EXERCISE_PROBLEM_FIELDS,
  exerciseFieldProblemsOf,
  exerciseFormResolver,
  exerciseFormValuesOf,
  exerciseSaveBodyOf,
  serverVideoRefusalMessage,
  newExerciseFormValues,
  shownExerciseProblemsOf,
  UNTOUCHED_VIDEO,
  type ExerciseFormValues,
  type ChosenExerciseVideo,
  type ExerciseProblemField,
  type ExerciseVideoEntry,
} from "./exercise-form";
import {
  ExerciseVideoField,
  isVideoUploading,
  type ExerciseVideoFieldHandle,
  type VideoUploadState,
} from "./exercise-video-field";
import { libraryReturnPath, returnPathAfterSave } from "./library-address";

const SAVE_FAILED = "We couldn't save the exercise. Try again in a moment.";

const NOT_UPLOADING: VideoUploadState = { state: "idle" };

const UPLOAD_FAILED: VideoUploadState = { state: "failed" };

function videoUploadStateOf(
  chosen: ChosenExerciseVideo,
  failedUpload: File | null,
  uploadState: UploadState,
): VideoUploadState {
  if (chosen.kind !== "attach") return NOT_UPLOADING;
  if (chosen.file === failedUpload) return UPLOAD_FAILED;

  return uploadState;
}

export async function loader(args: LoaderFunctionArgs) {
  const { exerciseLibrary } = args.context.get(exerciseLibraryContext);
  const { exerciseId } = args.params;

  return exerciseId === undefined
    ? exerciseLibrary.loadNew(args)
    : exerciseLibrary.load(args, exerciseId);
}

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  {
    title: `${loaderData?.exercise ? "Edit exercise" : "New exercise"} | Evoa`,
  },
];

export default function ExerciseEditorRoute() {
  const editor = useLoaderData<typeof loader>();

  return <ExerciseEditor editor={editor} key={editor.exercise?.id ?? "new"} />;
}

function subscribeToNothing() {
  return () => {};
}

function useLibraryPathCarriedByInAppNavigation(): string {
  const { state } = useLocation();
  const reachedInApp = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  const [libraryPath] = useState(() =>
    libraryReturnPath(reachedInApp ? state : null),
  );

  return libraryPath;
}

function ExerciseEditor({ editor }: { editor: ExerciseEditorView }) {
  const { exercise } = editor;
  const navigate = useNavigate();
  const libraryPath = useLibraryPathCarriedByInAppNavigation();
  const takenNames = useRef<readonly string[]>(editor.otherNames);
  const sentName = useRef("");
  const videoField = useRef<ExerciseVideoFieldHandle>(null);
  const [resolver] = useState(() =>
    exerciseFormResolver(() => takenNames.current),
  );
  const form = useForm<ExerciseFormValues>({
    defaultValues: exercise
      ? exerciseFormValuesOf(exercise)
      : newExerciseFormValues(),
    mode: "onChange",
    resolver,
  });
  const values = form.watch();
  const problems = shownExerciseProblemsOf(form.formState.errors);
  const [video, setVideo] = useState<ExerciseVideoEntry>(UNTOUCHED_VIDEO);
  const [failedUpload, setFailedUpload] = useState<File | null>(null);

  useEffect(
    () =>
      form.subscribe({
        callback: () => void form.trigger(),
        formState: { values: true },
      }),
    [form],
  );

  const rememberTakenName = (problems: ExerciseProblems) => {
    if (problems.name === "taken") {
      takenNames.current = [...takenNames.current, sentName.current];
    }
  };

  const showRefusedFields = (
    problems: ExerciseProblems,
  ): ExerciseProblemField[] => {
    const refused = exerciseFieldProblemsOf(problems);
    const refusedFields = EXERCISE_PROBLEM_FIELDS.filter(
      (field) => refused[field],
    );

    refusedFields.forEach((field, index) =>
      form.setError(
        field,
        { message: refused[field], type: "server" },
        { shouldFocus: index === 0 },
      ),
    );
    return refusedFields;
  };

  const showRefusedVideo = (problems: ExerciseProblems): boolean => {
    if (problems.video === undefined || video.chosen.kind !== "attach") {
      return false;
    }

    const problem = serverVideoRefusalMessage(
      problems.video,
      video.chosen.file,
    );
    setVideo((current) => ({ ...current, problem }));
    return true;
  };

  const showRefusal = (problems: ExerciseProblems): boolean => {
    const fieldsShown = showRefusedFields(problems).length > 0;
    const videoShown = showRefusedVideo(problems);

    if (videoShown && !fieldsShown) videoField.current?.queueReplaceFocus();

    return fieldsShown || videoShown;
  };

  const settle = (outcome: SaveOutcome<ExerciseProblems>) => {
    if (outcome.status === "saved") {
      toast.success(exercise ? "Exercise updated" : "Exercise created");
      void navigate(returnPathAfterSave(outcome.redirectTo, libraryPath));
      return;
    }

    if (outcome.status === "refused") {
      rememberTakenName(outcome.problems);

      if (showRefusal(outcome.problems)) return;
    }

    if (video.chosen.kind === "attach") {
      setFailedUpload(video.chosen.file);
      return;
    }

    toast.error(SAVE_FAILED);
  };

  const { save, saving, fetcherState } = useSaveFetcher({
    target: exercise
      ? { action: exercisePath(exercise.id), method: "put" }
      : { action: EXERCISE_LIBRARY_API_PATHS.exercises, method: "post" },
    savedAnswer: exerciseSavedAnswerSchema,
    refusedAnswer: exerciseProblemsAnswerSchema,
    onSettled: settle,
  });
  const uploadState = useUploadState(exerciseVideoUploadProgress, fetcherState);
  const videoUpload = videoUploadStateOf(
    video.chosen,
    failedUpload,
    uploadState,
  );

  const submit = form.handleSubmit((submitted) => {
    sentName.current = submitted.name;
    setFailedUpload(null);
    save(exerciseSaveBodyOf(submitted, video.chosen));
  });

  return (
    <div className="w-full max-w-3xl" data-parity-root="ExerciseEditorPage">
      <PortalBackLink to={libraryPath}>Back to exercises</PortalBackLink>
      <PortalPageHeader title={exercise ? "Edit exercise" : "New exercise"} />

      <form noValidate onSubmit={submit}>
        <div className="space-y-6 sm:space-y-8">
          <ExerciseAboutSection
            form={form}
            problems={problems}
            values={values}
          />
          <ExerciseWorkSection
            form={form}
            problems={problems}
            values={values}
          />
          <ExerciseCoachingSection
            form={form}
            problems={problems}
            videoField={
              <ExerciseVideoField
                onChange={setVideo}
                onRetry={() => void submit()}
                ref={videoField}
                upload={videoUpload}
                stored={exercise?.video ?? null}
                video={video}
              />
            }
          />
        </div>

        <div
          className="mt-8 flex items-center justify-end gap-3"
          data-parity="exercise-editor-actions"
        >
          <Link
            className={buttonVariants({ size: "md", variant: "ghost" })}
            to={libraryPath}
          >
            Cancel
          </Link>
          <Button
            aria-busy={saving || undefined}
            disabled={!form.formState.isValid || saving}
            size="md"
            type="submit"
            variant="primary"
          >
            {isVideoUploading(videoUpload) ? (
              "Saving…"
            ) : (
              <>
                <Check aria-hidden="true" size={16} />
                {exercise ? "Save changes" : "Create exercise"}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
