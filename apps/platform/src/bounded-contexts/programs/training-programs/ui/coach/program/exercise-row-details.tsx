import { Plus, RotateCcw, Sparkles, X } from "lucide-react";
import { useId, type ReactNode } from "react";

import { cn, LABEL_CLASS } from "~/shared/design-system/lib";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "~/shared/design-system/primitives";

import {
  LAST_SET_TECHNIQUES,
  MAX_SUBSTITUTIONS,
  SessionEditing,
  type ExerciseRow,
  type LastSetTechnique,
  type LibraryExercise,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";
import {
  useOpenExerciseDetail,
  type ExerciseDetailContent,
} from "~/bounded-contexts/programs/training-programs/ui/shared/program-view/exercise-detail-content";
import { exerciseNameOf } from "~/bounded-contexts/programs/training-programs/ui/shared/program-view/program-view";
import { SwapRows } from "~/bounded-contexts/programs/training-programs/ui/shared/program-view/swap-list";

import { IconActionButton } from "./icon-action-button";
import { LIBRARY_TARGET_CLASS, useIsLibraryTarget } from "./library-target";
import {
  DropZone,
  LIBRARY_EXERCISE,
  type DraggedItem,
  type SessionDropRules,
} from "./session-dnd";

type ExerciseRowDetailsProps = {
  row: ExerciseRow;
  exercise: LibraryExercise | undefined;
  detail: ExerciseDetailContent | null;
  libraryExercises: readonly LibraryExercise[];
  substitutionDrop: SessionDropRules;
  onChange: (row: ExerciseRow) => void;
  onAddSubstitution: () => void;
  onRemoveSubstitution: (exerciseId: string) => void;
  onSuggestSubstitutions: () => void;
};

type DetailProps = {
  label: string;
  actions?: ReactNode;
  children: (labelId: string) => ReactNode;
};

const LAST_SET_TECHNIQUE_LABELS: Record<LastSetTechnique, string> = {
  none: "None",
  "drop-set": "Drop set",
  "rest-pause": "Rest-pause",
};

function isLastSetTechnique(value: string): value is LastSetTechnique {
  return (LAST_SET_TECHNIQUES as readonly string[]).includes(value);
}

function Detail({ label, actions, children }: DetailProps) {
  const labelId = useId();

  return (
    <div className="grid min-w-0 content-start gap-1.5">
      {actions ? (
        <div className="flex min-h-8 items-center gap-2">
          <span className={LABEL_CLASS} id={labelId}>
            {label}
          </span>
          {actions}
        </div>
      ) : (
        <span className={LABEL_CLASS} id={labelId}>
          {label}
        </span>
      )}
      {children(labelId)}
    </div>
  );
}

function acceptsSubstitution(dragged: DraggedItem): boolean {
  return (
    dragged.kind === LIBRARY_EXERCISE &&
    dragged.item.exercise.type === "resistance"
  );
}

function Substitutions({
  row,
  exercise,
  detail,
  libraryExercises,
  substitutionDrop,
  onAddSubstitution,
  onRemoveSubstitution,
  onSuggestSubstitutions,
}: ExerciseRowDetailsProps) {
  const openDetail = useOpenExerciseDetail();
  const name = exerciseNameOf(exercise);
  const swaps = row.substitutions.flatMap(
    (id) => libraryExercises.find((item) => item.id === id) ?? [],
  );
  const room = row.substitutions.length < MAX_SUBSTITUTIONS;
  const filling = useIsLibraryTarget({
    kind: "substitution",
    sessionId: substitutionDrop.sessionId,
    rowId: row.id,
  });

  return (
    <DropZone
      accepts={acceptsSubstitution}
      className={cn("rounded-field", { [LIBRARY_TARGET_CLASS]: filling })}
      rules={substitutionDrop}
    >
      <fieldset className="grid gap-1.5">
        <legend className={cn(LABEL_CLASS, "mb-1.5")}>Substitutions</legend>
        {swaps.length > 0 && (
          <SwapRows
            actionFor={(swap) =>
              detail
                ? {
                    kind: "open",
                    onOpen: (opener) => openDetail(detail, opener, swap),
                  }
                : { kind: "static" }
            }
            label={`Swaps for ${name}`}
            swaps={swaps}
            trailingFor={(swap) => (
              <IconActionButton
                hint="Remove"
                icon={X}
                label={`Remove ${swap.name}`}
                onClick={() => onRemoveSubstitution(swap.id)}
              />
            )}
          />
        )}
        {room && (
          <div className="flex items-center gap-4">
            <IconActionButton
              hint="Add substitution"
              icon={Plus}
              label={`Add substitution for ${name}`}
              onClick={onAddSubstitution}
            />
            {exercise && (
              <Button
                onClick={onSuggestSubstitutions}
                size="xs"
                variant="ghost"
              >
                <Sparkles aria-hidden="true" />
                Suggest
              </Button>
            )}
          </div>
        )}
      </fieldset>
    </DropZone>
  );
}

function resetCues(row: ExerciseRow, exercise: LibraryExercise): ExerciseRow {
  return {
    ...row,
    cues: exercise.cues,
    touched: row.touched.filter((field) => field !== "cues"),
  };
}

export function ExerciseRowDetails(props: ExerciseRowDetailsProps) {
  const { row, exercise, onChange } = props;

  return (
    <>
      <Detail label="Tempo">
        {(labelId) => (
          <Input
            aria-labelledby={labelId}
            onChange={(event) =>
              onChange(
                SessionEditing.withField(
                  row,
                  "tempo",
                  event.target.value || undefined,
                ),
              )
            }
            placeholder="Lower for 3 seconds, pause 1 second at the bottom"
            value={row.tempo ?? ""}
          />
        )}
      </Detail>
      <Detail
        actions={
          <IconActionButton
            disabled={!exercise}
            hint="Reset from library"
            icon={RotateCcw}
            label="Reset cues from library"
            onClick={() => exercise && onChange(resetCues(row, exercise))}
          />
        }
        label="Cues"
      >
        {(labelId) => (
          <Textarea
            aria-labelledby={labelId}
            onChange={(event) =>
              onChange(
                SessionEditing.withField(row, "cues", event.target.value),
              )
            }
            value={row.cues}
          />
        )}
      </Detail>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Detail label="Last set">
          {(labelId) => (
            <Select
              onValueChange={(value) => {
                if (!isLastSetTechnique(value)) return;
                onChange(
                  SessionEditing.withField(row, "lastSetTechnique", value),
                );
              }}
              value={row.lastSetTechnique}
            >
              <SelectTrigger aria-labelledby={labelId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LAST_SET_TECHNIQUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {LAST_SET_TECHNIQUE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Detail>
        <Detail label="Progression">
          {(labelId) => (
            <Select
              onValueChange={(value) =>
                onChange(
                  SessionEditing.withField(
                    row,
                    "progression",
                    value === "custom"
                      ? { kind: "custom", text: "" }
                      : { kind: "double" },
                  ),
                )
              }
              value={row.progression.kind}
            >
              <SelectTrigger aria-labelledby={labelId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="double">Double progression</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          )}
        </Detail>
        {row.progression.kind === "custom" && (
          <Textarea
            aria-label="Custom progression"
            className="sm:col-span-2"
            onChange={(event) =>
              onChange(
                SessionEditing.withField(row, "progression", {
                  kind: "custom",
                  text: event.target.value,
                }),
              )
            }
            value={row.progression.text}
          />
        )}
      </div>
      <Substitutions {...props} />
    </>
  );
}
