import { MAX_EXERCISE_VIDEO_BYTES } from "@eli-coach-platform/domain";
import { Button, cn } from "@eli-coach-platform/ui";
import { UploadCloud } from "lucide-react";
import { useEffect, useId, useRef, useState, type DragEvent } from "react";

export type ExerciseVideoValue =
  | { kind: "none" }
  | { kind: "stored"; url: string }
  | { kind: "picked"; file: File; previewUrl: string };

type ExerciseVideoFieldProps = {
  onChange: (value: ExerciseVideoValue) => void;
  value: ExerciseVideoValue;
};

/** What the picker offers (PRD §6 req 3: raw .mp4 upload). */
const MP4_ACCEPT = ".mp4,video/mp4";
const MAX_MEGABYTES = MAX_EXERCISE_VIDEO_BYTES / (1024 * 1024);

/**
 * Names the file so a second rejection reads differently from the first — a
 * live region announces only text that changed. A file dragged from some file
 * managers arrives with an empty `type`, so the extension counts as well.
 */
function describeRejection(file: File): string | null {
  const isMp4 = file.type === "video/mp4" || file.name.toLowerCase().endsWith(".mp4");

  if (!isMp4) {
    return `${file.name} is not an .mp4 — only .mp4 videos are supported`;
  }

  if (file.size > MAX_EXERCISE_VIDEO_BYTES) {
    return `${file.name} is larger than ${MAX_MEGABYTES} MB`;
  }

  return null;
}

function previewSource(value: ExerciseVideoValue): string | null {
  if (value.kind === "picked") return value.previewUrl;
  if (value.kind === "stored") return value.url;

  return null;
}

export function ExerciseVideoField(props: ExerciseVideoFieldProps) {
  const { onChange, value } = props;
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // The id exists for the description hook-up: the alert names the control
  // whose pick failed.
  const errorId = useId();
  const previewUrl = value.kind === "picked" ? value.previewUrl : null;

  useEffect(
    () => () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl],
  );

  function select(file: File | undefined) {
    if (!file) {
      return;
    }

    const rejection = describeRejection(file);

    if (rejection) {
      setError(rejection);
      return;
    }

    setError(null);
    onChange({ file, kind: "picked", previewUrl: URL.createObjectURL(file) });
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    select(event.dataTransfer.files[0]);
  }

  const source = previewSource(value);

  return (
    <fieldset>
      <legend className="mb-1.5 text-body-sm font-semibold text-text-primary">
        Demonstration Video
      </legend>
      {source ? (
        <div className="flex flex-col gap-2">
          {/* Muted only as the initial state — the controls unmute — so the
              preview never starts sound on its own and needs no caption track. */}
          <video
            className="aspect-video w-full rounded-md bg-surface-inverted"
            controls
            muted
            preload="metadata"
            src={source}
          />
          <Button
            className="self-start"
            onClick={() => {
              setError(null);
              onChange({ kind: "none" });
            }}
            size="sm"
            variant="ghost"
          >
            Remove video
          </Button>
        </div>
      ) : (
        // Dropping is pointer-only by nature and "Browse Files" is the keyboard
        // path, so the drop target itself is presentational — the same shape as
        // the portal shell's backdrop.
        <div
          className={cn(
            "rounded-panel border-2 border-dashed p-6 text-center transition-colors",
            {
              "border-brand-primary bg-brand-primary-soft": isDragging,
              "border-border-subtle bg-surface-subtle": !isDragging,
            },
          )}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDrop={drop}
          role="presentation"
        >
          <span
            aria-hidden="true"
            className="mx-auto mb-3 flex size-12 items-center justify-center rounded-pill bg-surface-base text-brand-primary shadow-soft"
          >
            <UploadCloud size={24} />
          </span>
          <p className="text-body-sm font-semibold text-text-primary">Drag and drop video</p>
          <p className="mb-4 mt-1 text-label normal-case tracking-normal text-text-secondary">
            MP4 up to {MAX_MEGABYTES}MB
          </p>
          <input
            accept={MP4_ACCEPT}
            aria-label="Demonstration video file"
            className="ui-sr-only"
            onChange={(event) => {
              select(event.target.files?.[0]);
              // Let the same file be picked again after a rejection.
              event.target.value = "";
            }}
            ref={inputRef}
            tabIndex={-1}
            type="file"
          />
          <Button
            aria-describedby={errorId}
            aria-invalid={error ? true : undefined}
            onClick={() => inputRef.current?.click()}
            size="sm"
            variant="ghost"
          >
            Browse Files
          </Button>
        </div>
      )}
      <p
        className="mt-3 text-body-sm font-semibold text-feedback-danger empty:mt-0"
        id={errorId}
        role="alert"
      >
        {error}
      </p>
    </fieldset>
  );
}
