import { joinBasePath } from "@eli-coach-platform/config";
import type { UploadState } from "@eli-coach-platform/infrastructure/http";
import {
  Alert,
  AlertAction,
  Button,
  FileDropzone,
  InlineProblem,
  MediaRemoveButton,
  Progress,
} from "@eli-coach-platform/ui/primitives";
import { RefreshCw } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import type { ExerciseView } from "~/features/exercise-library/public/exercises";

import {
  EXERCISE_VIDEO_ACCEPT,
  browserVideoRefusalMessage,
  KEEP_VIDEO,
  MAX_EXERCISE_VIDEO_MEGABYTES,
  REMOVE_VIDEO,
  type ExerciseVideoEntry,
} from "./exercise-form";

export type VideoUploadState = UploadState | { state: "failed" };

type StoredExerciseVideo = ExerciseView["video"];

type VideoFieldFocus = "replace" | "picker" | null;

type ExerciseVideoFieldProps = {
  stored: StoredExerciseVideo;
  video: ExerciseVideoEntry;
  upload: VideoUploadState;
  onChange: (video: ExerciseVideoEntry) => void;
  onRetry: () => void;
};

const VIDEO_GUIDANCE = `MP4 or MOV up to ${MAX_EXERCISE_VIDEO_MEGABYTES} MB, in a format that plays well on a phone.`;
const VIDEO_PROMPT = "Drop a video here or choose one";
const UPLOAD_FAILED =
  "The upload didn’t go through. Your entries are still here.";

export function isVideoUploading(upload: VideoUploadState): boolean {
  return upload.state === "sending" || upload.state === "preparing";
}

function shownVideoUrlOf(
  video: ExerciseVideoEntry,
  stored: StoredExerciseVideo,
): string | null {
  if (video.chosen.kind === "attach") return video.chosen.previewUrl;
  if (video.chosen.kind === "remove" || stored === null) return null;

  return joinBasePath(import.meta.env.BASE_URL, stored.path);
}

function videoUploadMessage(upload: VideoUploadState): string {
  return upload.state === "sending"
    ? `Uploading video… ${Math.round(upload.fraction * 100)}%`
    : "Finishing up…";
}

function VideoUploadProgress({ upload }: { upload: VideoUploadState }) {
  return (
    <div
      className="grid max-w-md gap-2 empty:hidden"
      data-parity="exercise-video-progress"
      role="status"
    >
      {isVideoUploading(upload) && (
        <>
          <p className="text-sm text-text-secondary tabular-nums">
            {videoUploadMessage(upload)}
          </p>
          <Progress
            aria-label="Video upload"
            value={
              upload.state === "sending" ? upload.fraction * 100 : undefined
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
  upload,
  onChange,
  onRetry,
}: ExerciseVideoFieldProps) {
  const problemId = useId();
  const replaceInput = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const replaceButton = useRef<HTMLButtonElement>(null);
  const focusAfterSwap = useRef<VideoFieldFocus>(null);
  const busy = isVideoUploading(upload);
  const shownUrl = shownVideoUrlOf(video, stored);
  const showsPreview = shownUrl !== null;
  const previewUrl =
    video.chosen.kind === "attach" ? video.chosen.previewUrl : null;
  const problemDescription = {
    "aria-describedby": video.problem ? problemId : undefined,
    "aria-invalid": video.problem ? true : undefined,
  };

  useEffect(() => {
    if (previewUrl === null) return;

    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    const target = focusAfterSwap.current;
    focusAfterSwap.current = null;
    if (target === "replace") replaceButton.current?.focus();
    if (target === "picker") picker.current?.focus();
  }, [showsPreview]);

  const chooseVideo = (file: File) => {
    const problem = browserVideoRefusalMessage(file);
    if (problem) {
      onChange({ ...video, problem });
      return;
    }

    if (!showsPreview) focusAfterSwap.current = "replace";
    onChange({
      chosen: { kind: "attach", file, previewUrl: URL.createObjectURL(file) },
      problem: null,
    });
  };

  const remove = () => {
    focusAfterSwap.current = "picker";
    onChange({ chosen: stored ? REMOVE_VIDEO : KEEP_VIDEO, problem: null });
  };

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
              if (file) chooseVideo(file);
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
              <MediaRemoveButton
                aria-label="Remove video"
                className="absolute top-2 right-2"
                disabled={busy}
                onClick={remove}
              />
            </div>
            <Button
              aria-label="Replace video"
              disabled={busy}
              onClick={() => replaceInput.current?.click()}
              ref={replaceButton}
              size="sm"
              variant="ghost"
              {...problemDescription}
            >
              <RefreshCw aria-hidden="true" size={16} />
              Replace
            </Button>
          </div>
          <VideoUploadProgress upload={upload} />
          {upload.state === "failed" && (
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
            ref={picker}
            hint={VIDEO_GUIDANCE}
            onFileChosen={chooseVideo}
            prompt={VIDEO_PROMPT}
            {...problemDescription}
          />
        </div>
      )}
      <div className="max-w-md empty:hidden" id={problemId} role="alert">
        {video.problem && <InlineProblem>{video.problem}</InlineProblem>}
      </div>
    </div>
  );
}
