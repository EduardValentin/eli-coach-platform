import { zodResolver } from "@hookform/resolvers/zod";
import {
  EQUIPMENT_OPTIONS,
  EXERCISE_DIFFICULTIES,
  EXERCISE_TAGS,
  MUSCLE_GROUPS,
  type MuscleGroup,
} from "@eli-coach-platform/domain";
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  inputClasses,
  SegmentedControl,
  textAreaClasses,
  ToggleChip,
} from "@eli-coach-platform/ui";
import { useId, useState } from "react";
import { useController, useForm, type SubmitHandler } from "react-hook-form";

import {
  exerciseDraftSchema,
  type ExerciseDraftInput,
  type ExerciseMutationResponse,
  type ExerciseWire,
} from "~/features/exercises/contracts/exercises";

import type { SaveExerciseRequest } from "./api-client";
import { ExerciseVideoField, type ExerciseVideoValue } from "./exercise-video-field";

type ExerciseEditorDialogProps = {
  exercise: ExerciseWire | null;
  onDismiss: () => void;
  onSaved: (exercise: ExerciseWire) => void;
  save: (request: SaveExerciseRequest) => Promise<ExerciseMutationResponse>;
};

const DIFFICULTY_OPTIONS = EXERCISE_DIFFICULTIES.map((difficulty) => ({
  label: difficulty,
  value: difficulty,
}));
const EMPTY_DRAFT: ExerciseDraftInput = {
  name: "",
  description: "",
  difficulty: "Beginner",
  equipment: [],
  primaryMuscles: [],
  secondaryMuscles: [],
  tags: [],
};
const FIELD_LABEL_CLASS = "mb-1.5 block text-body-sm font-semibold text-text-primary";
const SUBGROUP_LABEL_CLASS = "mb-2 text-label normal-case tracking-normal text-text-secondary";
const FIELD_ERROR_CLASS = "mt-1.5 text-body-sm font-semibold text-feedback-danger empty:hidden";

function toDraft(exercise: ExerciseWire): ExerciseDraftInput {
  return {
    name: exercise.name,
    description: exercise.description,
    difficulty: exercise.difficulty,
    equipment: [...exercise.equipment],
    primaryMuscles: [...exercise.primaryMuscles],
    secondaryMuscles: [...exercise.secondaryMuscles],
    tags: [...exercise.tags],
  };
}

function toInitialVideo(exercise: ExerciseWire | null): ExerciseVideoValue {
  return exercise?.video ? { kind: "stored", url: exercise.video.url } : { kind: "none" };
}

function toVideoRequest(
  value: ExerciseVideoValue,
  exercise: ExerciseWire | null,
): SaveExerciseRequest["video"] {
  if (value.kind === "picked") {
    return { file: value.file, kind: "replace" };
  }

  if (value.kind === "none" && exercise?.video) {
    return { kind: "remove" };
  }

  return { kind: "keep" };
}

function toggleValue<Value extends string>(values: readonly Value[], value: Value): Value[] {
  return values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value];
}

function isDraftField(field: string, draft: ExerciseDraftInput): field is keyof ExerciseDraftInput {
  return field in draft;
}

export function ExerciseEditorDialog(props: ExerciseEditorDialogProps) {
  const { exercise, onDismiss, onSaved, save } = props;
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    setError,
    setValue,
  } = useForm<ExerciseDraftInput>({
    defaultValues: exercise ? toDraft(exercise) : EMPTY_DRAFT,
    resolver: zodResolver(exerciseDraftSchema),
  });
  const [video, setVideo] = useState<ExerciseVideoValue>(() => toInitialVideo(exercise));
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const nameErrorId = useId();
  const difficulty = useController({ control, name: "difficulty" });
  const tags = useController({ control, name: "tags" });
  const equipment = useController({ control, name: "equipment" });
  const primaryMuscles = useController({ control, name: "primaryMuscles" });
  const secondaryMuscles = useController({ control, name: "secondaryMuscles" });

  const submit: SubmitHandler<ExerciseDraftInput> = async (draft) => {
    setServerError(null);
    setIsSaving(true);

    const response = await save({ draft, video: toVideoRequest(video, exercise) });

    setIsSaving(false);

    if (response.success) {
      onSaved(response.exercise);
      return;
    }

    let videoMessage: string | null = null;

    for (const issue of response.error.issues ?? []) {
      const field = Array.isArray(issue.path) ? String(issue.path[0]) : "";
      const message = String(issue.message);

      if (field === "video") {
        videoMessage = message;
      } else if (isDraftField(field, draft)) {
        setError(field, { message });
      }
    }

    setServerError(videoMessage ?? response.error.message);
  };

  function togglePrimaryMuscle(muscle: MuscleGroup) {
    const next = toggleValue(primaryMuscles.field.value, muscle);

    primaryMuscles.field.onChange(next);

    // A muscle cannot be both primary and secondary, so promoting one drops
    // it from the secondary list.
    if (next.includes(muscle)) {
      setValue(
        "secondaryMuscles",
        secondaryMuscles.field.value.filter((current) => current !== muscle),
      );
    }
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          onDismiss();
        }
      }}
      open
    >
      <DialogContent className="flex max-w-2xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-border-faint p-6">
          <div>
            <DialogTitle>{exercise ? "Edit Exercise" : "Create New Exercise"}</DialogTitle>
            <DialogDescription className="ui-sr-only">
              Fill in the exercise details and attach an MP4 demonstration.
            </DialogDescription>
          </div>
        </DialogHeader>
        <form className="flex min-h-0 flex-1 flex-col" noValidate onSubmit={handleSubmit(submit)}>
          <div className="flex flex-col gap-6 overflow-y-auto p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block">
                    <span className={FIELD_LABEL_CLASS}>Exercise Name</span>
                    <input
                      aria-describedby={nameErrorId}
                      aria-invalid={errors.name ? true : undefined}
                      className={inputClasses({ controlSize: "md", variant: "portal-subtle" })}
                      placeholder="e.g. Barbell Back Squat"
                      type="text"
                      {...register("name")}
                    />
                  </label>
                  <p className={FIELD_ERROR_CLASS} id={nameErrorId} role="alert">
                    {errors.name?.message}
                  </p>
                </div>
                <SegmentedControl
                  legend="Difficulty"
                  name="difficulty"
                  onValueChange={difficulty.field.onChange}
                  options={DIFFICULTY_OPTIONS}
                  value={difficulty.field.value}
                />
                <fieldset>
                  <legend className={FIELD_LABEL_CLASS}>Tags</legend>
                  <div className="flex flex-wrap gap-2">
                    {EXERCISE_TAGS.map((tag) => (
                      <ToggleChip
                        key={tag}
                        onPressedChange={() =>
                          tags.field.onChange(toggleValue(tags.field.value, tag))
                        }
                        pressed={tags.field.value.includes(tag)}
                      >
                        {tag}
                      </ToggleChip>
                    ))}
                  </div>
                </fieldset>
                <label className="block">
                  <span className={FIELD_LABEL_CLASS}>Description / Form Cues</span>
                  <textarea
                    className={cn(textAreaClasses({ variant: "portal-subtle" }), "resize-none")}
                    placeholder="Keep chest up, drive through heels..."
                    rows={4}
                    {...register("description")}
                  />
                </label>
                <fieldset>
                  <legend className={FIELD_LABEL_CLASS}>Equipment</legend>
                  <div className="flex flex-wrap gap-2">
                    {EQUIPMENT_OPTIONS.map((item) => (
                      <ToggleChip
                        key={item}
                        onPressedChange={() =>
                          equipment.field.onChange(toggleValue(equipment.field.value, item))
                        }
                        pressed={equipment.field.value.includes(item)}
                      >
                        {item}
                      </ToggleChip>
                    ))}
                  </div>
                </fieldset>
              </div>
              <div className="flex flex-col gap-6">
                <ExerciseVideoField onChange={setVideo} value={video} />
                <fieldset>
                  <legend className={FIELD_LABEL_CLASS}>Target Muscles</legend>
                  <fieldset className="mb-3">
                    <legend className={SUBGROUP_LABEL_CLASS}>Primary</legend>
                    <div className="flex flex-wrap gap-2">
                      {MUSCLE_GROUPS.map((muscle) => (
                        <ToggleChip
                          key={muscle}
                          onPressedChange={() => togglePrimaryMuscle(muscle)}
                          pressed={primaryMuscles.field.value.includes(muscle)}
                        >
                          {muscle}
                        </ToggleChip>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset>
                    <legend className={SUBGROUP_LABEL_CLASS}>Secondary</legend>
                    <div className="flex flex-wrap gap-2">
                      {MUSCLE_GROUPS.filter(
                        (muscle) => !primaryMuscles.field.value.includes(muscle),
                      ).map((muscle) => (
                        <ToggleChip
                          key={muscle}
                          onPressedChange={() =>
                            secondaryMuscles.field.onChange(
                              toggleValue(secondaryMuscles.field.value, muscle),
                            )
                          }
                          pressed={secondaryMuscles.field.value.includes(muscle)}
                        >
                          {muscle}
                        </ToggleChip>
                      ))}
                    </div>
                  </fieldset>
                </fieldset>
              </div>
            </div>
            {serverError ? (
              <p className="text-body-sm font-semibold text-feedback-danger" role="alert">
                {serverError}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border-faint bg-surface-subtle p-6">
            <Button context="portal" onClick={onDismiss} type="button" variant="text">
              Cancel
            </Button>
            <Button className="px-6" context="portal" disabled={isSaving} type="submit">
              {exercise ? "Save Changes" : "Create Exercise"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
