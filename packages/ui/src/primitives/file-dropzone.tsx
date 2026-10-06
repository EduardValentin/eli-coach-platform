import { Upload } from "lucide-react";
import { useId, useState, type ChangeEvent, type DragEvent } from "react";

import { cn } from "../lib/cn";
import { describedByOf } from "../lib/described-by";
import { buttonVariants } from "./button";

type FilePickerProps = {
  id?: string;
  accept: string;
  onFileChosen: (file: File) => void;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

type HiddenFileInputProps = FilePickerProps & {
  hintId?: string;
  label?: string;
  labelledBy?: string;
};

function takeChosenFile(
  event: ChangeEvent<HTMLInputElement>,
): File | undefined {
  const file = event.target.files?.[0];
  event.target.value = "";

  return file;
}

function HiddenFileInput(props: HiddenFileInputProps) {
  return (
    <input
      accept={props.accept}
      aria-describedby={describedByOf(props.hintId, props["aria-describedby"])}
      aria-invalid={props["aria-invalid"]}
      aria-label={props.label}
      aria-labelledby={props.labelledBy}
      className="sr-only"
      id={props.id}
      onChange={(event) => {
        const file = takeChosenFile(event);
        if (file) props.onFileChosen(file);
      }}
      type="file"
    />
  );
}

type FileDropzoneProps = FilePickerProps & {
  prompt: string;
  hint: string;
};

export function FileDropzone({ prompt, hint, ...picker }: FileDropzoneProps) {
  const promptId = useId();
  const hintId = useId();
  const [dragging, setDragging] = useState(false);
  const invalid = picker["aria-invalid"] === true;

  const allowDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(true);
  };

  const leave = (event: DragEvent<HTMLLabelElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    setDragging(false);
  };

  const drop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) picker.onFileChosen(file);
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- dropping is a pointer shortcut; the file input inside is the keyboard path
    <label
      className={cn(
        "flex cursor-pointer flex-col items-center gap-2 rounded-field border border-dashed bg-surface-quiet px-4 py-8 text-center transition-colors hover:bg-surface-muted",
        {
          "border-control-border-soft": !dragging && !invalid,
          "border-feedback-danger": !dragging && invalid,
          "border-primary bg-primary-soft hover:bg-primary-soft": dragging,
        },
      )}
      data-chip-control=""
      data-dragging={dragging ? "" : undefined}
      onDragEnter={allowDrop}
      onDragLeave={leave}
      onDragOver={allowDrop}
      onDrop={drop}
    >
      <HiddenFileInput {...picker} hintId={hintId} labelledBy={promptId} />
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-full bg-surface-base text-text-secondary shadow-card"
      >
        <Upload className="size-5" />
      </span>
      <span className="text-sm font-medium text-text-primary" id={promptId}>
        {prompt}
      </span>
      <span className="text-sm text-text-secondary" id={hintId}>
        {hint}
      </span>
    </label>
  );
}

type FilePickerButtonProps = FilePickerProps & {
  children: string;
};

export function FilePickerButton({
  children,
  ...picker
}: FilePickerButtonProps) {
  return (
    <label
      className={buttonVariants({
        className: "cursor-pointer",
        size: "xs",
        variant: "outline",
      })}
      data-chip-control=""
    >
      <HiddenFileInput {...picker} label={children} />
      <span aria-hidden="true">{children}</span>
    </label>
  );
}
