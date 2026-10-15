import { joinBasePath } from "@eli-coach-platform/config";
import type { UploadState } from "@eli-coach-platform/infrastructure/http";
import {
  Alert,
  AlertAction,
  Button,
  FileDropzone,
  Progress,
} from "@eli-coach-platform/ui/primitives";
import { RefreshCw, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import type { ExerciseView } from "~/features/exercise-library/public/exercises";

import {
  EXERCISE_VIDEO_ACCEPT,
  exerciseVideoRefusalOf,
  KEEP_VIDEO,
  MAX_EXERCISE_VIDEO_MEGABYTES,
  REMOVE_VIDEO,
  type ExerciseVideoEntry,
} from "./exercise-form";

export type ExerciseVideoSaving = UploadState | { state: "failed" };

type StoredExerciseVideo = ExerciseView["video"];

type ExerciseVideoFieldProps = {
  stored: StoredExerciseVideo;
  video: ExerciseVideoEntry;
  saving: ExerciseVideoSaving;
  onChange: (video: ExerciseVideoEntry) => void;
  onRetry: () => void;
};

const VIDEO_GUIDANCE = `MP4 or MOV up to ${MAX_EXERCISE_VIDEO_MEGABYTES} MB, in a format that plays well on a phone.`;
const VIDEO_PROMPT = "Drop a video here or choose one";
const UPLOAD_FAILED =
  "The upload didn’t go through. Your entries are still here.";

export function isVideoUploading(saving: ExerciseVideoSaving): boolean {
  return saving.state === "sending" || saving.state === "preparing";
}

function shownVideoUrlOf(
  video: ExerciseVideoEntry,
  stored: StoredExerciseVideo,
): string | null {
  if (video.choice.kind === "attach") return video.choice.previewUrl;
  if (video.choice.kind === "remove" || stored === null) return null;

  return joinBasePath(import.meta.env.BASE_URL, stored.path);
}

function videoSavingMessage(saving: ExerciseVideoSaving): string {
  return saving.state === "sending"
    ? `Uploading video… ${Math.round(saving.fraction * 100)}%`
    : "Finishing up…";
}

function VideoSaveProgress({ saving }: { saving: ExerciseVideoSaving }) {
  return (
    <div
      className="grid max-w-md gap-2 empty:hidden"
      data-parity="exercise-video-progress"
      role="status"
    >
      {isVideoUploading(saving) && (
        <>
          <p className="text-sm text-text-secondary tabular-nums">
            {videoSavingMessage(saving)}
          </p>
          <Progress
            aria-label="Video upload"
            className="h-1.5"
            value={
              saving.state === "sending" ? saving.fraction * 100 : undefined
            }
          />
        </>
      )}
    </div>
  );
}

export function ExerciseVideoField({
  stored,
  video,
  saving,
  onChange,
  onRetry,
}: ExerciseVideoFieldProps) {
  const problemId = useId();
  const replaceInput = useRef<HTMLInputElement>(null);
  const busy = isVideoUploading(saving);
  const shownUrl = shownVideoUrlOf(video, stored);
  const previewUrl =
    video.choice.kind === "attach" ? video.choice.previewUrl : null;
  const refusal = {
    "aria-describedby": video.problem ? problemId : undefined,
    "aria-invalid": video.problem ? true : undefined,
  };

  useEffect(() => {
    if (previewUrl === null) return;

    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const take = (file: File) => {
    const problem = exerciseVideoRefusalOf(file);
    if (problem) {
      onChange({ ...video, problem });
      return;
    }

    onChange({
      choice: { kind: "attach", file, previewUrl: URL.createObjectURL(file) },
      problem: null,
    });
  };

  const remove = () =>
    onChange({ choice: stored ? REMOVE_VIDEO : KEEP_VIDEO, problem: null });

  return (
    <div className="grid gap-3">
      {shownUrl ? (
        <>
          <input
            accept={EXERCISE_VIDEO_ACCEPT}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) take(file);
            }}
            ref={replaceInput}
            type="file"
          />
          <div
            className="flex flex-wrap items-center gap-x-6 gap-y-3"
            data-parity="exercise-video-row"
          >
            <div
              className="relative flex aspect-video w-full max-w-md items-center justify-center overflow-hidden rounded-card bg-surface-inverted"
              data-parity="exercise-video-frame"
            >
              <video
                aria-label="Demo video preview"
                className="h-full w-full object-contain"
                controls
                playsInline
                preload="metadata"
                src={shownUrl}
              />
              <Button
                aria-label="Remove video"
                className="absolute top-2 right-2 size-8 bg-surface-base shadow-card hover:bg-surface-muted"
                disabled={busy}
                onClick={remove}
                size="icon-sm"
                variant="outline"
              >
                <X aria-hidden="true" />
              </Button>
            </div>
            <Button
              aria-label="Replace video"
              disabled={busy}
              onClick={() => replaceInput.current?.click()}
              size="sm"
              variant="ghost"
              {...refusal}
            >
              <RefreshCw aria-hidden="true" size={16} />
              Replace
            </Button>
          </div>
          <VideoSaveProgress saving={saving} />
          {saving.state === "failed" && (
            <Alert
              action={<AlertAction onClick={onRetry}>Try again</AlertAction>}
              className="max-w-md"
            >
              {UPLOAD_FAILED}
            </Alert>
          )}
        </>
      ) : (
        <div className="max-w-md">
          <FileDropzone
            accept={EXERCISE_VIDEO_ACCEPT}
            hint={VIDEO_GUIDANCE}
            onFileChosen={take}
            prompt={VIDEO_PROMPT}
            {...refusal}
          />
        </div>
      )}
      <p
        className="max-w-md text-xs font-medium text-feedback-danger empty:hidden"
        id={problemId}
        role="alert"
      >
        {video.problem}
      </p>
    </div>
  );
}
